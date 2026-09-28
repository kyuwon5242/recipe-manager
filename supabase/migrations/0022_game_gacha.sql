-- ゲーム要素 フェーズB(design: game-design.md)
-- ガチャ本体: 家族単位の1日の回数管理と、旬・レアリティで重み付けした抽選。
-- 抽選・回数消費・カード付与・入手履歴の記録は draw_gacha() の1トランザクションで行う
-- (同時に引かれても回数を超えないよう、家族の行をロックする)。

-- ============================================================
-- 1. 家族のガチャ状況(日次リセット)
-- ============================================================
create table if not exists public.family_game_profile (
  family_id uuid primary key references public.families(id) on delete cascade,
  gacha_date date not null,
  draws_used_today int not null default 0 check (draws_used_today >= 0),
  bonus_draws_today int not null default 0 check (bonus_draws_today >= 0),
  updated_at timestamptz not null default now()
);

alter table public.family_game_profile enable row level security;

-- 閲覧のみ許可。書き込みは draw_gacha() / 今後のクイズ機能の関数(security definer)経由に限り、
-- 画面から直接ガチャ回数を書き換えられないようにする。
create policy "family members can select family_game_profile"
  on public.family_game_profile for select
  to authenticated
  using (public.is_family_member(family_id));

-- ============================================================
-- 2. 今日の残り回数
--    gacha_dateが今日(日本時間)でなければ未使用・ボーナス無しとして返す(書き込みはしない)
--    残り = 基本3枚 + ボーナス - 使用済み
-- ============================================================
create or replace function public.get_gacha_status(p_family_id uuid)
returns table (base_draws int, bonus_draws int, used_draws int, remaining_draws int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_base constant int := 3;
  v_profile public.family_game_profile%rowtype;
begin
  if auth.uid() is null or not public.is_family_member(p_family_id) then
    raise exception 'forbidden';
  end if;

  select * into v_profile from public.family_game_profile where family_id = p_family_id;

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
-- 3. ガチャを1回引く
--    抽選の重み(1枚あたり) = レアリティ別の基礎重み × 旬なら3倍
--      ノーマル12 / レア6 / スーパーレア3 / レジェンド1
--      旬 = 今日(日本時間)の月が ingredients_master.season_months に含まれる
--    旬データ(season_months)の無い食材は旬倍率なし。
--    重みを変えたいときは、この関数を create or replace で書き換える。
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

  -- 家族の行を作ってロック(同時に引いても回数を超えないようにする)
  insert into public.family_game_profile (family_id, gacha_date)
  values (p_family_id, v_today)
  on conflict (family_id) do nothing;

  select * into v_profile
  from public.family_game_profile
  where family_id = p_family_id
  for update;

  -- 日付が変わっていれば使用済み・ボーナスをリセット
  if v_profile.gacha_date <> v_today then
    v_profile.gacha_date := v_today;
    v_profile.draws_used_today := 0;
    v_profile.bonus_draws_today := 0;
  end if;

  if v_base + v_profile.bonus_draws_today - v_profile.draws_used_today <= 0 then
    raise exception 'gacha_no_draws_left';
  end if;

  -- 重み付き抽選(累積重みが 乱数×総重み を初めて超えたカードを当選とする)
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

  -- カード付与(初入手ならfirst_acquired_*を記録。消費で0枚になったカードの再入手は「新規」扱いにしない)
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
  set gacha_date = v_today,
      draws_used_today = v_profile.draws_used_today + 1,
      bonus_draws_today = v_profile.bonus_draws_today,
      updated_at = now()
  where family_id = p_family_id;

  return query select
    v_card_id,
    v_prev_acquired_at is null,
    v_owned,
    v_base + v_profile.bonus_draws_today - (v_profile.draws_used_today + 1);
end;
$$;

revoke all on function public.get_gacha_status(uuid) from public;
revoke all on function public.draw_gacha(uuid) from public;
grant execute on function public.get_gacha_status(uuid) to authenticated;
grant execute on function public.draw_gacha(uuid) to authenticated;
