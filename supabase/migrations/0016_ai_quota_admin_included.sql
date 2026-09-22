-- フェーズ19の追加対応: 管理者もAI利用上限のゲージ管理対象に含める
-- (これまでは管理者は常に無制限だったが、管理者自身も他ユーザーと同じ
-- ように利用量を消費するようにする)。管理者は/admin/ai-usageから、
-- 自分自身を含め誰でも上限を復活(リセット)できるため、運用上困らない。

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

create or replace function public.consume_ai_quota(p_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data public.ai_usage_quota;
begin
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
