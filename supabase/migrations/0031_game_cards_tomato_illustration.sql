-- トマトのカード画像を、縁取り・名前入りの仮画像(トマト.jpg)から
-- 本番仕様(食材のみ・白背景)のトマト.pngに差し替える。
-- (public/cards/トマト.png は public/cards/bk/ から配置済み)

update public.game_cards gc
set illustration_url = 'トマト.png'
from public.ingredients_master im
where gc.ingredient_id = im.id
  and im.name = 'トマト';
