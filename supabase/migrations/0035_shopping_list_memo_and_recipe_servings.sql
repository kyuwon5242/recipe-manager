-- 買い物リストのメモ機能(リスト全体で1つ)用のカラムを追加する。
-- 既存のshopping_lists UPDATE RLS(0009_menu_agent_access_and_shopping_settings.sql)
-- は家族メンバーなら誰でも更新可能なため、列を増やすだけでRLSの変更は不要。
alter table public.shopping_lists
  add column if not exists memo text;

-- 食材リスト作成時に指定した「何人前作るか」を、買い物リスト確定後も
-- ホーム画面の「今回つくるレシピ」で表示できるよう、確定時点の人数を
-- shopping_list_recipesに保存する(従来はrecipe_ingredientsの数量
-- スケーリングにのみ使い、確定後は失われていた)。
alter table public.shopping_list_recipes
  add column if not exists servings integer;
