-- 管理者機能・利用停止機能(フェーズ7)

alter table public.profiles
  add column is_admin boolean not null default false,
  add column is_suspended boolean not null default false;

-- 管理者判定関数(is_family_memberと同じ設計。RLSの再帰を避けるためSECURITY DEFINER)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 非管理者が自分自身のis_admin/is_suspendedを書き換えられないようにする
-- (「本人が自分のプロフィールを更新できる」ポリシーだけでは列単位の制御ができないため)
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    new.is_admin = old.is_admin;
    new.is_suspended = old.is_suspended;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields
before update on public.profiles
for each row execute function public.protect_profile_admin_fields();

-- 管理者は家族を問わず全レシピ・材料・プロフィール・家族情報を参照・編集可能
create policy "admins can select all recipes"
  on public.recipes for select
  to authenticated
  using (public.is_admin());

create policy "admins can update all recipes"
  on public.recipes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete all recipes"
  on public.recipes for delete
  to authenticated
  using (public.is_admin());

create policy "admins can select all recipe_ingredients"
  on public.recipe_ingredients for select
  to authenticated
  using (public.is_admin());

create policy "admins can insert all recipe_ingredients"
  on public.recipe_ingredients for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can update all recipe_ingredients"
  on public.recipe_ingredients for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete all recipe_ingredients"
  on public.recipe_ingredients for delete
  to authenticated
  using (public.is_admin());

create policy "admins can select all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "admins can update all profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can select all families"
  on public.families for select
  to authenticated
  using (public.is_admin());

create policy "admins can select all family_members"
  on public.family_members for select
  to authenticated
  using (public.is_admin());
