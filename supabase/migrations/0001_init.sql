-- 自炊レシピ管理アプリ フェーズ1 初期スキーマ
-- recipes / ingredients_master / recipe_ingredients

create extension if not exists "pgcrypto";

-- 5.2 ingredients_master(食材マスタ)
create table if not exists public.ingredients_master (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_unit text,
  category text,
  created_at timestamptz not null default now()
);

-- 5.1 recipes(レシピ)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  genre text,
  servings int,
  instructions text,
  memo text,
  recipe_url text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.3 recipe_ingredients(レシピごとの必要食材)
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients_master(id) on delete restrict,
  quantity numeric,
  unit text
);

create index if not exists recipe_ingredients_recipe_id_idx
  on public.recipe_ingredients(recipe_id);
create index if not exists recipe_ingredients_ingredient_id_idx
  on public.recipe_ingredients(ingredient_id);

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

-- RLS
-- フェーズ1は認証未実装(設計書 3章)。家族共有の前提で anon キーによる
-- 読み書きを許可する。将来認証を追加する際はここを見直すこと。
alter table public.recipes enable row level security;
alter table public.ingredients_master enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists "public read recipes" on public.recipes;
create policy "public read recipes" on public.recipes for select using (true);
drop policy if exists "public insert recipes" on public.recipes;
create policy "public insert recipes" on public.recipes for insert with check (true);
drop policy if exists "public update recipes" on public.recipes;
create policy "public update recipes" on public.recipes for update using (true) with check (true);
drop policy if exists "public delete recipes" on public.recipes;
create policy "public delete recipes" on public.recipes for delete using (true);

drop policy if exists "public read ingredients_master" on public.ingredients_master;
create policy "public read ingredients_master" on public.ingredients_master for select using (true);
drop policy if exists "public insert ingredients_master" on public.ingredients_master;
create policy "public insert ingredients_master" on public.ingredients_master for insert with check (true);
drop policy if exists "public update ingredients_master" on public.ingredients_master;
create policy "public update ingredients_master" on public.ingredients_master for update using (true) with check (true);

drop policy if exists "public read recipe_ingredients" on public.recipe_ingredients;
create policy "public read recipe_ingredients" on public.recipe_ingredients for select using (true);
drop policy if exists "public insert recipe_ingredients" on public.recipe_ingredients;
create policy "public insert recipe_ingredients" on public.recipe_ingredients for insert with check (true);
drop policy if exists "public update recipe_ingredients" on public.recipe_ingredients;
create policy "public update recipe_ingredients" on public.recipe_ingredients for update using (true) with check (true);
drop policy if exists "public delete recipe_ingredients" on public.recipe_ingredients;
create policy "public delete recipe_ingredients" on public.recipe_ingredients for delete using (true);

-- Storage: レシピ写真用バケット
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read recipe photos" on storage.objects;
create policy "public read recipe photos" on storage.objects
  for select using (bucket_id = 'recipe-photos');
drop policy if exists "public upload recipe photos" on storage.objects;
create policy "public upload recipe photos" on storage.objects
  for insert with check (bucket_id = 'recipe-photos');
drop policy if exists "public update recipe photos" on storage.objects;
create policy "public update recipe photos" on storage.objects
  for update using (bucket_id = 'recipe-photos');
drop policy if exists "public delete recipe photos" on storage.objects;
create policy "public delete recipe photos" on storage.objects
  for delete using (bucket_id = 'recipe-photos');
