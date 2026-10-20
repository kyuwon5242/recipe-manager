-- 献立単位のメモ(買い物メモ`memo`とは別に、今回の献立についてのメモを残せる
-- ようにする)。献立トレイ(確定前)・買い物リスト詳細の「対象の献立」欄
-- (確定後)の両方から入力でき、ホーム画面の「今回つくるレシピ」にも表示する。
alter table public.shopping_lists
  add column if not exists meal_memo text;
