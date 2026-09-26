-- 食材の読み仮名(ふりがな)。ゲーム要素の食材カードで、漢字が読めない
-- 子供でも遊べるようにカード名にルビ表示するために追加する。

alter table public.ingredients_master
  add column if not exists reading text;
