-- 献立エージェントの個別権限、買い物リストの上書き・更新日時、
-- 家族ごとのデフォルト食材・よく使うスーパー(カテゴリ順)設定(フェーズ12)

-- ============================================================
-- 1. 献立エージェントの個別アクセス権限
-- ============================================================
alter table public.profiles
  add column can_use_menu_agent boolean not null default false;

-- 非管理者が自分自身の権限系フィールドを書き換えられないようにするトリガーに
-- can_use_menu_agent も追加する(0007で作成したprotect_profile_admin_fieldsの拡張)
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    new.is_admin = old.is_admin;
    new.is_suspended = old.is_suspended;
    new.can_use_menu_agent = old.can_use_menu_agent;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 2. 家族ごとの「よく使うスーパー」(カテゴリの並び順を保持、最大10件はアプリ側で制御)
-- ============================================================
create table if not exists public.family_stores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  category_order text[] not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists family_stores_family_id_idx on public.family_stores(family_id);

alter table public.family_stores enable row level security;

create policy "family members can select family_stores"
  on public.family_stores for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family owner can insert family_stores"
  on public.family_stores for insert
  to authenticated
  with check (public.is_family_owner(family_id));

create policy "family owner can update family_stores"
  on public.family_stores for update
  to authenticated
  using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));

create policy "family owner can delete family_stores"
  on public.family_stores for delete
  to authenticated
  using (public.is_family_owner(family_id));

-- ============================================================
-- 3. 家族ごとの「どの買い物でも必ず含める食材」
-- ============================================================
create table if not exists public.family_default_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  category text not null default '未分類',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists family_default_items_family_id_idx on public.family_default_items(family_id);

alter table public.family_default_items enable row level security;

create policy "family members can select family_default_items"
  on public.family_default_items for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family owner can insert family_default_items"
  on public.family_default_items for insert
  to authenticated
  with check (public.is_family_owner(family_id));

create policy "family owner can update family_default_items"
  on public.family_default_items for update
  to authenticated
  using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));

create policy "family owner can delete family_default_items"
  on public.family_default_items for delete
  to authenticated
  using (public.is_family_owner(family_id));

-- ============================================================
-- 4. 買い物リスト: 更新日時・使用したスーパー・上書き保存に対応するUPDATE権限
-- ============================================================
alter table public.shopping_lists
  add column updated_at timestamptz not null default now(),
  add column store_id uuid references public.family_stores(id) on delete set null;

create policy "family members can update shopping_lists"
  on public.shopping_lists for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
