-- ゲーム要素: クイズのガチャボーナス条件を「正解のたびに+1回」から
-- 「1日3問すべてに正解したら+1回」に変更する。
-- answer_quiz() を置き換える(get_next_quiz() は変更なし)。

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
    -- 家族のその日のガチャにボーナス+1回(日付が変わっていれば使用済み・ボーナスをリセットしてから加算)
    insert into public.family_game_profile (family_id, gacha_date)
    values (p_family_id, v_today)
    on conflict (family_id) do nothing;

    update public.family_game_profile
    set draws_used_today = case when gacha_date <> v_today then 0 else draws_used_today end,
        bonus_draws_today = (case when gacha_date <> v_today then 0 else bonus_draws_today end) + 1,
        gacha_date = v_today,
        updated_at = now()
    where family_id = p_family_id;
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

revoke all on function public.answer_quiz(uuid, uuid, int) from public;
grant execute on function public.answer_quiz(uuid, uuid, int) to authenticated;
