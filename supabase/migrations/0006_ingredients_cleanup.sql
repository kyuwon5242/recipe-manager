-- 食材マスタの表記ゆれ整理機能のため、重複行の削除を許可する

create policy "authenticated can delete ingredients_master"
  on public.ingredients_master for delete
  to authenticated
  using (true);
