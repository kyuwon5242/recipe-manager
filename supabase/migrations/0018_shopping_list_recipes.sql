-- 買い物リスト作成時の元レシピを記録する(フェーズ20)。トップページの
-- 「今回つくるレシピ」表示に使う。shopping_list_itemsはレシピとの紐付けを
-- 持たない(名前・数量・単位・カテゴリのみ)ため、別テーブルで持つ。

create table if not exists public.shopping_list_recipes (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0
);

create index if not exists shopping_list_recipes_list_id_idx
  on public.shopping_list_recipes(shopping_list_id);

alter table public.shopping_list_recipes enable row level security;

create policy "family members can select shopping_list_recipes"
  on public.shopping_list_recipes for select
  to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_recipes.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );

create policy "family members can insert shopping_list_recipes"
  on public.shopping_list_recipes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_recipes.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );

create policy "family members can delete shopping_list_recipes"
  on public.shopping_list_recipes for delete
  to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_recipes.shopping_list_id
      and public.is_family_member(sl.family_id)
    )
  );
