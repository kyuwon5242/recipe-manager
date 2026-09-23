-- ゲーム要素 フェーズA(design: game-design.md)
-- 旬データ基盤・カードマスタ・家族の図鑑(所持カード)・入手履歴
-- このフェーズではガチャは実装しない(図鑑閲覧の基盤のみ)。

-- ============================================================
-- 1. 旬データ
-- ============================================================
alter table public.ingredients_master
  add column if not exists season_months integer[];

-- ============================================================
-- 2. カードマスタ(教育コンテンツ。ingredients_masterと1:1)
-- ============================================================
create table if not exists public.game_cards (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null unique references public.ingredients_master(id) on delete cascade,
  rarity text not null check (rarity in ('normal', 'rare', 'super_rare', 'legendary')),
  illustration_url text,
  trivia_kids_text text,
  trivia_adult_text text,
  nutrition_summary text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. 家族の図鑑(所持カード)
-- ============================================================
create table if not exists public.family_cards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  card_id uuid not null references public.game_cards(id) on delete cascade,
  owned_count int not null default 0 check (owned_count >= 0),
  first_acquired_by uuid references public.profiles(id),
  first_acquired_at timestamptz,
  unique (family_id, card_id)
);

create index if not exists family_cards_family_id_idx
  on public.family_cards(family_id);

-- ============================================================
-- 4. カード入手履歴(誰が・いつ・何を引いたか)
-- ============================================================
create table if not exists public.card_acquisitions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  card_id uuid not null references public.game_cards(id) on delete cascade,
  acquired_by uuid not null references public.profiles(id),
  acquired_at timestamptz not null default now()
);

create index if not exists card_acquisitions_family_id_idx
  on public.card_acquisitions(family_id);

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.game_cards enable row level security;
alter table public.family_cards enable row level security;
alter table public.card_acquisitions enable row level security;

-- game_cards: ingredients_masterと同じく家族を跨いだ共有マスタ。
-- 閲覧は全ユーザー、作成・編集・削除は管理者のみ(初期カードは管理者が手動投入)。
create policy "authenticated can select game_cards"
  on public.game_cards for select
  to authenticated
  using (true);

create policy "admins can insert game_cards"
  on public.game_cards for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can update game_cards"
  on public.game_cards for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete game_cards"
  on public.game_cards for delete
  to authenticated
  using (public.is_admin());

-- family_cards: 家族単位の図鑑。所属家族のみ閲覧・更新可
create policy "family members can select family_cards"
  on public.family_cards for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family members can insert family_cards"
  on public.family_cards for insert
  to authenticated
  with check (public.is_family_member(family_id));

create policy "family members can update family_cards"
  on public.family_cards for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- card_acquisitions: 所属家族のみ閲覧・追記可(履歴のため更新・削除は無し)
create policy "family members can select card_acquisitions"
  on public.card_acquisitions for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family members can insert card_acquisitions"
  on public.card_acquisitions for insert
  to authenticated
  with check (public.is_family_member(family_id));
