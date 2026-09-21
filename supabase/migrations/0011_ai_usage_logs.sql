-- AI機能の利用量を記録するテーブル(フェーズ15: 可視化のみ。ユーザー
-- ごとの利用制限は将来の対応)。各AI呼び出しのたびに1行追加する。

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  feature text not null,
  model text not null,
  input_tokens int not null,
  output_tokens int not null,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_created_at_idx on public.ai_usage_logs(created_at);
create index if not exists ai_usage_logs_user_id_idx on public.ai_usage_logs(user_id);
create index if not exists ai_usage_logs_family_id_idx on public.ai_usage_logs(family_id);

alter table public.ai_usage_logs enable row level security;

-- 自分自身の利用として記録する行のみ挿入できる(他人になりすませない)
create policy "authenticated can insert own ai_usage_logs"
  on public.ai_usage_logs for insert
  to authenticated
  with check (user_id = auth.uid());

-- 利用量は他ユーザーのプライバシーに関わる情報のため、閲覧は管理者限定
create policy "admins can select ai_usage_logs"
  on public.ai_usage_logs for select
  to authenticated
  using (public.is_admin());
