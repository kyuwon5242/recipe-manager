-- 認証・家族機能の追加(フェーズ2.5)
-- Supabase Auth(Google OAuth + メール/パスワード)+ 家族単位のレシピ共有

-- ============================================================
-- 0. 既存データのクリーンアップ(family_id が無い旧データを破棄)
-- ============================================================
delete from public.recipes;
-- storage.objects は直接DELETE不可のため、写真が残っている場合は
-- Supabaseダッシュボードの Storage > recipe-photos から手動で削除してください。

-- ============================================================
-- 1. テーブル作成
-- ============================================================

-- auth.users と1:1のプロフィール
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 家族
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 家族メンバー(中間テーブル)
create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- recipes に家族・作成者・更新者カラムを追加
alter table public.recipes
  add column family_id uuid not null references public.families(id) on delete cascade,
  add column created_by uuid not null references public.profiles(id),
  add column updated_by uuid not null references public.profiles(id);

-- ============================================================
-- 2. ヘルパー関数(SECURITY DEFINERでRLSの再帰を回避)
-- ============================================================

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- 新規サインアップ時に profiles を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 家族を新規作成し、自分をownerとして登録する
create or replace function public.create_family(family_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family public.families;
begin
  insert into public.families (name, owner_id)
  values (family_name, auth.uid())
  returning * into new_family;

  insert into public.family_members (family_id, user_id, role)
  values (new_family.id, auth.uid(), 'owner');

  return new_family;
end;
$$;

-- 招待コードで家族に参加する
create or replace function public.join_family_with_code(code text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family public.families;
begin
  select * into target_family from public.families where invite_code = upper(code);

  if not found then
    raise exception '招待コードが見つかりません';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (target_family.id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return target_family;
end;
$$;

-- recipes の作成者・更新者を自動設定
create or replace function public.set_recipe_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by = auth.uid();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create or replace function public.set_recipe_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- ============================================================
-- 3. トリガー
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists recipes_set_created_by on public.recipes;
create trigger recipes_set_created_by
  before insert on public.recipes
  for each row execute function public.set_recipe_created_by();

drop trigger if exists recipes_set_updated_by on public.recipes;
create trigger recipes_set_updated_by
  before update on public.recipes
  for each row execute function public.set_recipe_updated_by();

-- ============================================================
-- 4. RLS 有効化
-- ============================================================
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;

-- ============================================================
-- 5. フェーズ1の「anonキーなら誰でも読み書き可」ポリシーを撤廃
-- ============================================================
drop policy if exists "public read recipes" on public.recipes;
drop policy if exists "public insert recipes" on public.recipes;
drop policy if exists "public update recipes" on public.recipes;
drop policy if exists "public delete recipes" on public.recipes;

drop policy if exists "public read ingredients_master" on public.ingredients_master;
drop policy if exists "public insert ingredients_master" on public.ingredients_master;
drop policy if exists "public update ingredients_master" on public.ingredients_master;

drop policy if exists "public read recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "public insert recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "public update recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "public delete recipe_ingredients" on public.recipe_ingredients;

drop policy if exists "public read recipe photos" on storage.objects;
drop policy if exists "public upload recipe photos" on storage.objects;
drop policy if exists "public update recipe photos" on storage.objects;
drop policy if exists "public delete recipe photos" on storage.objects;

-- ============================================================
-- 6. 新しいRLSポリシー
-- ============================================================

-- profiles: 自分自身、または同じ家族に所属する人のプロフィールのみ閲覧可
drop policy if exists "members can view profiles in their family" on public.profiles;
create policy "members can view profiles in their family"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm2.user_id = profiles.id
    )
  );

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- families: 所属メンバーのみ閲覧可。作成・参加はRPC経由(create_family / join_family_with_code)
drop policy if exists "members can view their family" on public.families;
create policy "members can view their family"
  on public.families for select
  to authenticated
  using (public.is_family_member(id));

drop policy if exists "owner can update family" on public.families;
create policy "owner can update family"
  on public.families for update
  to authenticated
  using (public.is_family_owner(id))
  with check (public.is_family_owner(id));

-- family_members: 同じ家族のメンバー一覧のみ閲覧可。追加はRPC経由のみ
drop policy if exists "members can view their family roster" on public.family_members;
create policy "members can view their family roster"
  on public.family_members for select
  to authenticated
  using (public.is_family_member(family_id));

-- recipes: 所属家族のレシピのみ読み書き可
create policy "family members can select recipes"
  on public.recipes for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family members can insert recipes"
  on public.recipes for insert
  to authenticated
  with check (public.is_family_member(family_id));

create policy "family members can update recipes"
  on public.recipes for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "family members can delete recipes"
  on public.recipes for delete
  to authenticated
  using (public.is_family_member(family_id));

-- recipe_ingredients: recipes.family_id を辿って判定
create policy "family members can select recipe_ingredients"
  on public.recipe_ingredients for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
      and public.is_family_member(r.family_id)
    )
  );

create policy "family members can insert recipe_ingredients"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
      and public.is_family_member(r.family_id)
    )
  );

create policy "family members can update recipe_ingredients"
  on public.recipe_ingredients for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
      and public.is_family_member(r.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
      and public.is_family_member(r.family_id)
    )
  );

create policy "family members can delete recipe_ingredients"
  on public.recipe_ingredients for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
      and public.is_family_member(r.family_id)
    )
  );

-- ingredients_master: 認証済みユーザーなら誰でも読み書き可(家族を跨いだ共有辞書)
create policy "authenticated can select ingredients_master"
  on public.ingredients_master for select
  to authenticated
  using (true);

create policy "authenticated can insert ingredients_master"
  on public.ingredients_master for insert
  to authenticated
  with check (true);

create policy "authenticated can update ingredients_master"
  on public.ingredients_master for update
  to authenticated
  using (true)
  with check (true);

-- storage: recipe-photos は「家族ID/ファイル名」の構成にし、家族単位でアクセス制御
create policy "family members can read recipe photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

create policy "family members can upload recipe photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

create policy "family members can update recipe photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

create policy "family members can delete recipe photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

-- ============================================================
-- 7. 権限付与
-- ============================================================
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family_with_code(text) to authenticated;
