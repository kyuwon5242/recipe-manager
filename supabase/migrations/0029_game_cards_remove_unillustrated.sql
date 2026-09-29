-- ゲーム要素: イラストを用意しないことになった6食材のカードを削除する。
-- (キムチ・ココナッツミルク・トマト水煮缶・トルティーヤ・ライスペーパー・乾燥わかめ)
-- game_cards を削除すると family_cards・card_acquisitions も on delete cascade で
-- 連動して消える(該当カードをすでに引いた家族がいた場合、その入手履歴も消える)。
-- ingredients_master(食材そのもの。レシピ側で使用)は削除しない。カードだけを
-- 図鑑・ガチャの対象から外す。

delete from public.game_cards gc
using public.ingredients_master im
where gc.ingredient_id = im.id
  and im.name in ('キムチ', 'ココナッツミルク', 'トマト水煮缶', 'トルティーヤ', 'ライスペーパー', '乾燥わかめ');
