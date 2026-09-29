-- ゲーム要素: ガチャの回数を「家族で1日3回を全員共有」から「メンバー各自が1日3回」に変更する。
-- 図鑑・カードの入手先(family_cards/card_acquisitions)は引き続き家族単位で共有する
-- (変わるのは「1日に引ける回数」の数え方だけ)。
-- クイズ正解時のガチャボーナスも、家族共有の回数が無くなったため、正解した本人の
-- 残り回数に+1回する形に変更する(1人1日3問すべて正解、の条件自体は変更なし)。
--
-- family_game_profile は日次でリセットされる一時的な状態のため、家族単位の
-- 既存データはそのまま引き継げない(合算されていた回数は個人には分配できない)。
-- 実害が小さい当日中に、いったん全削除してユーザー単位の構造に作り直す。

delete from public.family_game_profile;

alter table public.family_game_profile drop constraint family_game_profile_pkey;
alter table public.family_game_profile add column user_id uuid references public.profiles(id) on delete cascade;
alter table public.family_game_profile alter column user_id set not null;
alter table public.family_game_profile add primary key (user_id);

-- ============================================================
-- 1. 今日の残り回数(呼び出したユーザー本人の分)
-- ============================================================
create or replace function public.get_gacha_status(p_family_id uuid)
returns table (base_draws int, bonus_draws int, used_draws int, remaining_draws int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_base constant int := 3;
  v_profile public.family_game_profile%rowtype;
begin
  if v_user is null or not public.is_family_member(p_family_id) then
    raise exception 'forbidden';
  end if;

  select * into v_profile from public.family_game_profile where user_id = v_user;

  if not found or v_profile.gacha_date <> v_today then
    return query select v_base, 0, 0, v_base;
  else
    return query select
      v_base,
      v_profile.bonus_draws_today,
      v_profile.draws_used_today,
      greatest(v_base + v_profile.bonus_draws_today - v_profile.draws_used_today, 0);
  end if;
end;
$$;

-- ============================================================
-- 2. ガチャを1回引く(回数はユーザー単位、カードの付与先は引き続き家族単位)
-- ============================================================
create or replace function public.draw_gacha(p_family_id uuid)
returns table (drawn_card_id uuid, is_new_card boolean, total_owned int, draws_remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_month int := extract(month from (now() at time zone 'Asia/Tokyo'))::int;
  v_base constant int := 3;
  v_profile public.family_game_profile%rowtype;
  v_roll numeric := random();
  v_card_id uuid;
  v_prev_acquired_at timestamptz;
  v_owned int;
begin
  if v_user is null or not public.is_family_member(p_family_id) then
    raise exception 'forbidden';
  end if;

  insert into public.family_game_profile (user_id, family_id, gacha_date)
  values (v_user, p_family_id, v_today)
  on conflict (user_id) do nothing;

  select * into v_profile
  from public.family_game_profile
  where user_id = v_user
  for update;

  if v_profile.gacha_date <> v_today then
    v_profile.gacha_date := v_today;
    v_profile.draws_used_today := 0;
    v_profile.bonus_draws_today := 0;
  end if;

  if v_base + v_profile.bonus_draws_today - v_profile.draws_used_today <= 0 then
    raise exception 'gacha_no_draws_left';
  end if;

  -- 重み付き抽選(累積重みが 乱数×総重み を初めて超えたカードを当選とする。ロジック自体は変更なし)
  select cum.id into v_card_id
  from (
    select
      weighted.id,
      sum(weighted.w) over (order by weighted.id) as cum_weight,
      sum(weighted.w) over () as total_weight
    from (
      select
        gc.id,
        (case gc.rarity when 'normal' then 12 when 'rare' then 6 when 'super_rare' then 3 else 1 end)
        * (case when im.season_months is not null and v_month = any(im.season_months) then 3 else 1 end)
        as w
      from public.game_cards gc
      join public.ingredients_master im on im.id = gc.ingredient_id
    ) weighted
  ) cum
  where cum.cum_weight > v_roll * cum.total_weight
  order by cum.cum_weight
  limit 1;

  if v_card_id is null then
    raise exception 'gacha_no_cards';
  end if;

  -- カード付与は引き続き家族単位(図鑑は家族で1つ)
  select fc.first_acquired_at into v_prev_acquired_at
  from public.family_cards fc
  where fc.family_id = p_family_id and fc.card_id = v_card_id;

  insert into public.family_cards (family_id, card_id, owned_count, first_acquired_by, first_acquired_at)
  values (p_family_id, v_card_id, 1, v_user, now())
  on conflict (family_id, card_id) do update
    set owned_count = public.family_cards.owned_count + 1,
        first_acquired_by = coalesce(public.family_cards.first_acquired_by, v_user),
        first_acquired_at = coalesce(public.family_cards.first_acquired_at, now())
  returning public.family_cards.owned_count into v_owned;

  insert into public.card_acquisitions (family_id, card_id, acquired_by)
  values (p_family_id, v_card_id, v_user);

  update public.family_game_profile
  set family_id = p_family_id,
      gacha_date = v_today,
      draws_used_today = v_profile.draws_used_today + 1,
      bonus_draws_today = v_profile.bonus_draws_today,
      updated_at = now()
  where user_id = v_user;

  return query select
    v_card_id,
    v_prev_acquired_at is null,
    v_owned,
    v_base + v_profile.bonus_draws_today - (v_profile.draws_used_today + 1);
end;
$$;

-- ============================================================
-- 3. クイズ回答(正解時のボーナスを本人の残り回数に+1回する)
-- ============================================================
create or replace function public.answer_quiz(
  p_family_id uuid,
  p_question_id uuid,
  p_selected_index int
)
returns table (
  result_is_correct boolean,
  result_correct_index int,
  result_explanation text,
  result_related_card_id uuid,
  result_bonus_granted boolean,
  result_answered_today int,
  result_daily_limit int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_limit constant int := 3;
  v_answered int;
  v_question public.quiz_questions%rowtype;
  v_is_correct boolean;
  v_card_id uuid;
  v_answered_after int;
  v_correct_after int;
  v_bonus_granted boolean;
begin
  if v_user is null or not public.is_family_member(p_family_id) then
    raise exception 'forbidden';
  end if;

  select count(*)::int into v_answered
  from public.quiz_attempts a
  where a.user_id = v_user
    and (a.answered_at at time zone 'Asia/Tokyo')::date = v_today;

  if v_answered >= v_limit then
    raise exception 'quiz_daily_limit';
  end if;

  select * into v_question from public.quiz_questions where id = p_question_id;
  if not found then
    raise exception 'quiz_not_found';
  end if;

  if exists (
    select 1 from public.quiz_attempts a
    where a.user_id = v_user
      and a.question_id = p_question_id
      and (a.answered_at at time zone 'Asia/Tokyo')::date = v_today
  ) then
    raise exception 'quiz_already_answered';
  end if;

  if p_selected_index is null or p_selected_index < 0 or p_selected_index >= jsonb_array_length(v_question.choices) then
    raise exception 'quiz_invalid_choice';
  end if;

  v_is_correct := (p_selected_index = v_question.correct_index);

  insert into public.quiz_attempts (user_id, question_id, is_correct)
  values (v_user, p_question_id, v_is_correct);

  -- ボーナスは「今日の3問すべてに回答し、かつ全問正解」の場合だけ、この最後の回答で1回だけ付与する
  -- (不正解が混じっていた場合は3問目でも付与されない。1問ごとの正解では付与しない)。
  select count(*)::int, (count(*) filter (where a.is_correct))::int
  into v_answered_after, v_correct_after
  from public.quiz_attempts a
  where a.user_id = v_user
    and (a.answered_at at time zone 'Asia/Tokyo')::date = v_today;

  v_bonus_granted := (v_answered_after = v_limit) and (v_correct_after = v_limit);

  if v_bonus_granted then
    -- 正解した本人の今日のガチャにボーナス+1回(日付が変わっていれば使用済み・ボーナスをリセットしてから加算)
    insert into public.family_game_profile (user_id, family_id, gacha_date)
    values (v_user, p_family_id, v_today)
    on conflict (user_id) do nothing;

    update public.family_game_profile
    set draws_used_today = case when gacha_date <> v_today then 0 else draws_used_today end,
        bonus_draws_today = (case when gacha_date <> v_today then 0 else bonus_draws_today end) + 1,
        gacha_date = v_today,
        family_id = p_family_id,
        updated_at = now()
    where user_id = v_user;
  end if;

  select gc.id into v_card_id
  from public.game_cards gc
  where gc.ingredient_id = v_question.related_ingredient_id;

  return query select
    v_is_correct,
    v_question.correct_index,
    v_question.explanation_text,
    v_card_id,
    v_bonus_granted,
    v_answered_after,
    v_limit;
end;
$$;

revoke all on function public.get_gacha_status(uuid) from public;
revoke all on function public.draw_gacha(uuid) from public;
revoke all on function public.answer_quiz(uuid, uuid, int) from public;
grant execute on function public.get_gacha_status(uuid) to authenticated;
grant execute on function public.draw_gacha(uuid) to authenticated;
grant execute on function public.answer_quiz(uuid, uuid, int) to authenticated;
