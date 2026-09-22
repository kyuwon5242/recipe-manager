-- 新レシピ提案・献立提案・レシピURL自動抽出の利用許可制(フェーズ20)。
-- 献立エージェントの can_use_menu_agent と同じ考え方で、新規ユーザーは
-- デフォルトで利用不可にし、管理者が個別に開放する。

alter table public.profiles
  add column can_use_ai_features boolean not null default false;

-- protect_profile_admin_fields()にcan_use_ai_featuresを追加する。あわせて、
-- 0009での再定義時に0008の修正(auth.uid() is not nullガード)が失われていた
-- ため、SQL Editorからの管理者権限付与が巻き戻らないよう合わせて直す。
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin = old.is_admin;
    new.is_suspended = old.is_suspended;
    new.can_use_menu_agent = old.can_use_menu_agent;
    new.can_use_ai_features = old.can_use_ai_features;
  end if;
  return new;
end;
$$;
