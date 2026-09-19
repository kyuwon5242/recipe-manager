-- レシピの「いいね」機能(フェーズ3)
-- 家族全体で共有するフラグとして管理する

alter table public.recipes
  add column is_favorite boolean not null default false;
