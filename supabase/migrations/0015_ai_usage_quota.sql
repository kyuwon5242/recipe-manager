-- ユーザー別のAI利用上限(フェーズ19)。全ユーザー共通の週間上限額(概算USD)を
-- 設定し、AI機能を使うたびに消費。最後の利用から7日経過していれば次回アクセス
-- 時に自動リセットする(Vercel Cron等の外部スケジューラは使わない、遅延リセット方式)。

-- 週間上限額(アプリ全体で1つ。ai_model_settingsと同じシングルトンパターン)
create table if not exists public.ai_quota_settings (
  id boolean primary key default true check (id),
  -- フェーズ19のベンチマーク実測(recipe_suggestion最大$0.089/回、menu_plan
  -- 最大$0.067/回、recipe_url_extract約$0.009/回、献立エージェント1往復
  -- 約$0.017/回)から、通常利用(週に新レシピ提案5回+献立提案4回+URL抽出3回
  -- +献立エージェント1セッション程度)の実費想定 約$0.8/週の3倍弱を上限とし、
  -- $2.00をデフォルトとした(詳細はrecipe-app-design.mdフェーズ19参照)。
  weekly_limit_usd numeric not null default 2.00,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.ai_quota_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.ai_quota_settings enable row level security;

create policy "authenticated can select ai_quota_settings"
  on public.ai_quota_settings for select
  to authenticated
  using (true);

create policy "admins can update ai_quota_settings"
  on public.ai_quota_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ユーザーごとの当該週の利用額
create table if not exists public.ai_usage_quota (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  period_start timestamptz not null default now(),
  used_cost_usd numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_usage_quota enable row level security;

-- 直接の読み書きはRPC経由に限定する(下記check_ai_quota/consume_ai_quotaは
-- SECURITY DEFINERで実行するためテーブル自体へのポリシーは閲覧のみでよい)
create policy "users can select own ai_usage_quota"
  on public.ai_usage_quota for select
  to authenticated
  using (user_id = auth.uid());

create policy "admins can select all ai_usage_quota"
  on public.ai_usage_quota for select
  to authenticated
  using (public.is_admin());

-- 自分の週間利用状況を取得する(無ければ作成、期限切れならリセットしてから返す)。
-- 管理者は献立エージェント利用許可などと同じく上限の対象外(is_unlimited=true)。
create or replace function public.check_ai_quota()
returns table (used_cost_usd numeric, limit_usd numeric, period_start timestamptz, is_unlimited boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data public.ai_usage_quota;
  settings_limit numeric;
begin
  if public.is_admin() then
    return query select 0::numeric, 0::numeric, now(), true;
    return;
  end if;

  select weekly_limit_usd into settings_limit from public.ai_quota_settings where id = true;

  insert into public.ai_usage_quota (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select * into row_data from public.ai_usage_quota where user_id = auth.uid();

  if row_data.period_start <= now() - interval '7 days' then
    update public.ai_usage_quota
    set period_start = now(), used_cost_usd = 0, updated_at = now()
    where user_id = auth.uid()
    returning * into row_data;
  end if;

  return query select row_data.used_cost_usd, coalesce(settings_limit, 2.00), row_data.period_start, false;
end;
$$;

-- 実際にAIを呼び出した後、コストを加算する(期限切れならリセットしてから加算)。
-- 管理者は上限の対象外のため記録しない。
create or replace function public.consume_ai_quota(p_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data public.ai_usage_quota;
begin
  if public.is_admin() then
    return;
  end if;

  insert into public.ai_usage_quota (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select * into row_data from public.ai_usage_quota where user_id = auth.uid();

  if row_data.period_start <= now() - interval '7 days' then
    update public.ai_usage_quota
    set period_start = now(), used_cost_usd = p_cost, updated_at = now()
    where user_id = auth.uid();
  else
    update public.ai_usage_quota
    set used_cost_usd = used_cost_usd + p_cost, updated_at = now()
    where user_id = auth.uid();
  end if;
end;
$$;

-- 管理者が、上限を使い切ったユーザーを個別に復活させる
create or replace function public.admin_reset_ai_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '管理者権限が必要です';
  end if;

  insert into public.ai_usage_quota (user_id, period_start, used_cost_usd)
  values (p_user_id, now(), 0)
  on conflict (user_id) do update
    set period_start = now(), used_cost_usd = 0, updated_at = now();
end;
$$;

grant execute on function public.check_ai_quota() to authenticated;
grant execute on function public.consume_ai_quota(numeric) to authenticated;
grant execute on function public.admin_reset_ai_quota(uuid) to authenticated;
