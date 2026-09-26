-- 図鑑カードのイラストファイル名を「食材名.png」に統一する(public/cards/配下)。
-- game_cards.illustration_url が未設定・別名のものも含め、全カードを上書きする。
update public.game_cards gc
set illustration_url = im.name || '.png'
from public.ingredients_master im
where im.id = gc.ingredient_id;
