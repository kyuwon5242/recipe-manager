-- recipes の created_by/updated_by 自動設定トリガーを修正。
-- 従来は auth.uid() で無条件に上書きしていたため、SQL Editor など
-- 認証コンテキストを持たないセッションからのINSERTがNOT NULL制約違反で
-- 失敗していた。auth.uid() が取れない場合は明示的に渡された値を使う。

create or replace function public.set_recipe_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by = coalesce(auth.uid(), new.created_by);
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create or replace function public.set_recipe_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;
