-- レシピ写真アップロード機能を廃止する。Supabase Storage(無料枠1GB)が
-- 将来的に最初のボトルネックになりやすいという試算(フェーズ15)を受けての
-- 対応。recipe_photosバケットの実データ削除はSupabaseダッシュボードの
-- Storage画面から手動で行うこと(このマイグレーションではRLSポリシーと
-- recipes.photo_url列のみを削除する)。

drop policy if exists "family members can read recipe photos" on storage.objects;
drop policy if exists "family members can upload recipe photos" on storage.objects;
drop policy if exists "family members can update recipe photos" on storage.objects;
drop policy if exists "family members can delete recipe photos" on storage.objects;

alter table public.recipes drop column if exists photo_url;
