-- ゲーム要素 フェーズD(design: game-design.md)
-- 料理作成: 家族が登録済みレシピの材料をカードで100%充足しているかを判定し、
-- 「料理を作る」を確定すると使ったカードを1枚ずつ消費して達成記録(family_dishes)を残す。
-- 1レシピにつき家族で1回のみ(family_id + recipe_id でunique)。
-- 家族ランクは family_dishes の件数(distinctなrecipe_id数)から都度算出するため、
-- 専用のカウンタテーブルは持たない(閾値・段階は src/lib/game/rank.ts 参照)。

-- ============================================================
-- 1. 料理作成の達成記録
-- ============================================================
create table if not exists public.family_dishes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, recipe_id)
);

create index if not exists family_dishes_family_id_idx on public.family_dishes(family_id);

-- ============================================================
-- 2. カード消費履歴(監査ログ)
-- ============================================================
create table if not exists public.card_consumptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  card_id uuid not null references public.game_cards(id) on delete cascade,
  family_dish_id uuid not null references public.family_dishes(id) on delete cascade,
  consumed_at timestamptz not null default now()
);

create index if not exists card_consumptions_family_dish_id_idx on public.card_consumptions(family_dish_id);

-- ============================================================
-- 3. RLS
--    閲覧のみ許可。書き込みは make_dish() (security definer) 経由に限り、
--    画面から直接「達成」やカード消費を書き換えられないようにする(既存のquiz_attempts等と同じパターン)。
-- ============================================================
alter table public.family_dishes enable row level security;
alter table public.card_consumptions enable row level security;

create policy "family members can select family_dishes"
  on public.family_dishes for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family members can select card_consumptions"
  on public.card_consumptions for select
  to authenticated
  using (public.is_family_member(family_id));

-- ============================================================
-- 4. 料理を作る
--    レシピの材料(recipe_ingredients)のうちカード化されている食材(game_cards)を対象に、
--    家族がその全カードを1枚以上持っているか判定する。対象カードが1つも無いレシピは対象外。
--    達成できたら family_dishes に1件記録し、対象カードをそれぞれ1枚ずつ消費する
--    (owned_count -1。0枚になっても「入手済み」表示=first_acquired_atは変更しない)。
--    同時に複数回呼ばれても二重消費・二重達成が起きないよう、対象カードの行をロックしてから判定する。
-- ============================================================
create or replace function public.make_dish(p_family_id uuid, p_recipe_id uuid)
returns table (dish_id uuid, achieved_at timestamptz, cards_consumed int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_required_card_ids uuid[];
  v_owned_ok int;
  v_dish_id uuid;
  v_card_id uuid;
begin
  if v_user is null or not public.is_family_member(p_family_id) then
    raise exception 'forbidden';
  end if;

  if not exists (select 1 from public.recipes r where r.id = p_recipe_id and r.family_id = p_family_id) then
    raise exception 'recipe_not_found';
  end if;

  if exists (select 1 from public.family_dishes fd where fd.family_id = p_family_id and fd.recipe_id = p_recipe_id) then
    raise exception 'dish_already_made';
  end if;

  select array_agg(distinct gc.id)
  into v_required_card_ids
  from public.recipe_ingredients ri
  join public.game_cards gc on gc.ingredient_id = ri.ingredient_id
  where ri.recipe_id = p_recipe_id;

  if v_required_card_ids is null or array_length(v_required_card_ids, 1) is null then
    raise exception 'dish_no_cards';
  end if;

  -- 対象カードの行をロック(同時に複数回呼ばれても同じ枚数を二重に消費しないようにする)
  perform 1
  from public.family_cards fc
  where fc.family_id = p_family_id and fc.card_id = any(v_required_card_ids)
  for update;

  select count(*)::int into v_owned_ok
  from public.family_cards fc
  where fc.family_id = p_family_id
    and fc.card_id = any(v_required_card_ids)
    and fc.owned_count > 0;

  if v_owned_ok < array_length(v_required_card_ids, 1) then
    raise exception 'dish_ingredients_missing';
  end if;

  insert into public.family_dishes (family_id, recipe_id, created_by)
  values (p_family_id, p_recipe_id, v_user)
  on conflict (family_id, recipe_id) do nothing
  returning id into v_dish_id;

  if v_dish_id is null then
    raise exception 'dish_already_made';
  end if;

  foreach v_card_id in array v_required_card_ids loop
    update public.family_cards
    set owned_count = owned_count - 1
    where family_id = p_family_id and card_id = v_card_id;

    insert into public.card_consumptions (family_id, card_id, family_dish_id)
    values (p_family_id, v_card_id, v_dish_id);
  end loop;

  return query select v_dish_id, now(), array_length(v_required_card_ids, 1);
end;
$$;

revoke all on function public.make_dish(uuid, uuid) from public;
grant execute on function public.make_dish(uuid, uuid) to authenticated;
