-- ゲーム要素 フェーズC(design: game-design.md)
-- クイズ: 個人単位で解答し、正解するとその日の家族のガチャに +1回のボーナスが付く。
--
-- 正解の位置(correct_index)が画面側に渡らないよう、quiz_questions は管理者以外に直接読ませず、
-- 出題(get_next_quiz)と解答判定(answer_quiz)は SECURITY DEFINER 関数だけで行う。
-- 定数(変える場合はこの関数を create or replace で書き換える):
--   1人あたり1日の出題数 = 3問 / 正解1問あたりのボーナス = ガチャ +1回

-- ============================================================
-- 1. クイズ問題
-- ============================================================
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('nutrition', 'season', 'origin', 'storage', 'cooking')),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  question_text text not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 6),
  correct_index int not null check (correct_index >= 0),
  explanation_text text not null,
  related_ingredient_id uuid references public.ingredients_master(id) on delete set null,
  created_at timestamptz not null default now(),
  check (correct_index < jsonb_array_length(choices))
);

-- ============================================================
-- 2. 解答履歴(本人単位)
-- ============================================================
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_answered_at_idx
  on public.quiz_attempts(user_id, answered_at desc);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- 問題は管理者のみ直接閲覧可(正解が見えてしまうため)。一般ユーザーは get_next_quiz() 経由。
create policy "admins can select quiz_questions"
  on public.quiz_questions for select
  to authenticated
  using (public.is_admin());

-- 解答履歴は本人のみ閲覧可。書き込みは answer_quiz() 経由に限る。
create policy "users can select own quiz_attempts"
  on public.quiz_attempts for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 4. 今日の出題
--    今日(日本時間)まだ答えていない問題から、その人が一度も答えていないものを優先して1問返す。
--    (全問答え済みなら、いちばん前に答えた問題から再出題する。)
--    同じ人・同じ日・同じ回答数の間は同じ問題を返す(再読み込みで問題を引き直せない)。
--    1日の上限に達していれば問題の列はnullで返す。正解の位置は返さない。
-- ============================================================
create or replace function public.get_next_quiz()
returns table (
  answered_today int,
  correct_today int,
  daily_limit int,
  next_question_id uuid,
  next_category text,
  next_difficulty text,
  next_question_text text,
  next_choices jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_limit constant int := 3;
  v_answered int;
  v_correct int;
  v_q_id uuid;
  v_q_category text;
  v_q_difficulty text;
  v_q_text text;
  v_q_choices jsonb;
begin
  if v_user is null then
    raise exception 'forbidden';
  end if;

  select count(*)::int, (count(*) filter (where a.is_correct))::int
  into v_answered, v_correct
  from public.quiz_attempts a
  where a.user_id = v_user
    and (a.answered_at at time zone 'Asia/Tokyo')::date = v_today;

  if v_answered < v_limit then
    select q.id, q.category, q.difficulty, q.question_text, q.choices
    into v_q_id, v_q_category, v_q_difficulty, v_q_text, v_q_choices
    from public.quiz_questions q
    left join lateral (
      select max(a.answered_at) as last_answered_at
      from public.quiz_attempts a
      where a.user_id = v_user and a.question_id = q.id
    ) last_attempt on true
    where not exists (
      select 1 from public.quiz_attempts a
      where a.user_id = v_user
        and a.question_id = q.id
        and (a.answered_at at time zone 'Asia/Tokyo')::date = v_today
    )
    order by
      (last_attempt.last_answered_at is not null),
      last_attempt.last_answered_at,
      md5(v_user::text || v_today::text || v_answered::text || q.id::text)
    limit 1;
  end if;

  -- 上限に達している・出題できる問題が無い場合は問題の列がnullのまま、回数の状況だけ返す
  return query select v_answered, v_correct, v_limit, v_q_id, v_q_category, v_q_difficulty, v_q_text, v_q_choices;
end;
$$;

-- ============================================================
-- 5. 解答
--    判定・履歴の記録・(正解なら)家族のその日のガチャにボーナス+1回を、1トランザクションで行う。
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

  if v_is_correct then
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
    v_is_correct,
    v_answered + 1,
    v_limit;
end;
$$;

revoke all on function public.get_next_quiz() from public;
revoke all on function public.answer_quiz(uuid, uuid, int) from public;
grant execute on function public.get_next_quiz() to authenticated;
grant execute on function public.answer_quiz(uuid, uuid, int) to authenticated;
