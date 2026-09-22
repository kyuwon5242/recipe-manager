-- 機能ごとに使うAIモデル(Opus 5 / Haiku 4.5)を管理者が切り替えられるようにする
-- ためのアプリ全体設定(家族単位ではなくアプリ単位で1つ)。シングルトン行として
-- 1行のみ存在させる(id列をboolean+CHECKで固定することで2行目の挿入を防ぐ)。

create table if not exists public.ai_model_settings (
  id boolean primary key default true check (id),
  menu_plan_model text not null default 'claude-opus-5',
  recipe_suggestion_model text not null default 'claude-opus-5',
  menu_agent_model text not null default 'claude-opus-5',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.ai_model_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.ai_model_settings enable row level security;

-- 全ユーザーが閲覧可能(呼び出す機能側がどのモデルを使うか判定するため)
create policy "authenticated can select ai_model_settings"
  on public.ai_model_settings for select
  to authenticated
  using (true);

-- 変更は管理者限定
create policy "admins can update ai_model_settings"
  on public.ai_model_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
