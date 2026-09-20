-- 0007で追加したprotect_profile_admin_fieldsトリガーの修正
--
-- SQL Editor(や直接のpsql接続)からのUPDATEはPostgRESTのJWTコンテキストを
-- 経由しないため auth.uid() が null になる。0007の実装では「管理者でなければ
-- is_admin/is_suspendedを元に戻す」としていたため、SQL Editorから管理者権限を
-- 付与しようとするUPDATE自体が巻き戻されてしまっていた(is_adminが常にfalseの
-- ままになるバグ)。
--
-- auth.uid()がnullになるのはPostgREST経由のリクエストではない場合に限られる
-- (通常のアプリ利用者は必ずJWTを伴うため、auth.uid()はnullにならない)。よって
-- 「auth.uid()がnullでない、かつ管理者でない」場合のみ書き換えを禁止するように
-- 修正し、SQL Editorからの運用は従来通り許可する。

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin = old.is_admin;
    new.is_suspended = old.is_suspended;
  end if;
  return new;
end;
$$;
