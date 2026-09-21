-- アプリ全体の処理ログ(トレース・エラー調査・処理時間計測用)。
-- ai_usage_logsがAI呼び出しに特化しているのに対し、こちらは一般的な
-- イベント・エラー・処理時間を記録する。Vercel無料プランのRuntime Logsは
-- 保持期間が短い(1時間)ため、durableに残しておきたいものはここに書く。

create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'warn', 'error')),
  event text not null,
  message text,
  path text,
  user_id uuid references public.profiles(id) on delete set null,
  family_id uuid references public.families(id) on delete set null,
  duration_ms int,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_logs_created_at_idx on public.app_logs(created_at);
create index if not exists app_logs_level_idx on public.app_logs(level);
create index if not exists app_logs_event_idx on public.app_logs(event);

alter table public.app_logs enable row level security;

-- 未ログイン状態のエラー(ログイン失敗など)も記録したいため、認証状態を
-- 問わず挿入できるようにする(閲覧は管理者限定なので情報漏えいの懸念は無い)。
create policy "anyone can insert app_logs"
  on public.app_logs for insert
  to authenticated, anon
  with check (true);

create policy "admins can select app_logs"
  on public.app_logs for select
  to authenticated
  using (public.is_admin());
