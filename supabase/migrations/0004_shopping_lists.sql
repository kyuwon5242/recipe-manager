-- 買い物リスト機能(フェーズ4)
-- 食材リスト(下書き)を確定させたものを「買い物リスト」として保存する。
-- 家族全体で共有し、作成者ごとに最大3件までの上限を持つ(アプリ側で制御)。

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  category text not null default '未分類',
  position int not null default 0,
  is_checked boolean not null default false
);

create index if not exists shopping_list_items_list_id_idx
  on public.shopping_list_items(shopping_list_id);
create index if not exists shopping_lists_family_created_by_idx
  on public.shopping_lists(family_id, created_by);

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "family members can select shopping_lists"
  on public.shopping_lists for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family members can insert shopping_lists"
  on public.shopping_lists for insert
  to authenticated
  with check (public.is_family_member(family_id));

create policy "family members can delete shopping_lists"
  on public.shopping_lists for delete
  to authenticated
  using (public.is_family_member(family_id));

create policy "family members can select shopping_list_items"
  on public.shopping_list_items for select
  to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );

create policy "family members can insert shopping_list_items"
  on public.shopping_list_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );

create policy "family members can update shopping_list_items"
  on public.shopping_list_items for update
  to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );

create policy "family members can delete shopping_list_items"
  on public.shopping_list_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );
