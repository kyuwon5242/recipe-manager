-- 同じ家族内で、同じタイトルのレシピを重複登録できてしまう問題への対応。
-- (1) 既存データに完全一致の重複があれば、作成日時が最も古い1件だけ残して削除する
--     (recipe_ingredients は on delete cascade のため材料行も連動して消える)。
-- (2) recipes(family_id, title) に一意制約を追加し、以後は同じ家族内で同じ
--     タイトルのレシピを二重に insert できないようにする。

with ranked as (
  select id,
         row_number() over (
           partition by family_id, title
           order by created_at asc, id asc
         ) as rn
  from public.recipes
)
delete from public.recipes r
using ranked
where r.id = ranked.id
  and ranked.rn > 1;

alter table public.recipes
  add constraint recipes_family_id_title_key unique (family_id, title);
