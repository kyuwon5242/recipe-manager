-- ゲーム要素: 画像は用意済みだがカード未作成だった5食材を追加する。
-- (舞茸・エリンギ・豆苗・ツナ缶は ingredients_master に行が無かったため新規作成。
--  水菜は既存の ingredients_master 行〈season_months設定済み〉を利用。)
-- イラストは public/cards/ に配置済み(食材名.jpg)。レアリティはいずれも
-- 既存の同種食材(えのきたけ・しめじ・小松菜・トマト水煮缶など)に合わせて
-- ノーマルとした。

-- ============================================================
-- 1. ingredients_master(まだ存在しない4件のみ)
-- ============================================================
insert into public.ingredients_master (name, category, season_months, reading)
values
  ('舞茸', '野菜・果物', array[9,10,11], 'まいたけ'),
  ('エリンギ', '野菜・果物', null, null),
  ('豆苗', '野菜・果物', null, 'とうみょう'),
  ('ツナ缶', '粉類・乾物・缶詰', null, 'つなかん')
on conflict (name) do nothing;

-- 水菜(既存行)には読みが未設定だったため補う
update public.ingredients_master
set reading = 'みずな'
where name = '水菜' and reading is null;

-- ============================================================
-- 2. game_cards
-- ============================================================
insert into public.game_cards
  (ingredient_id, rarity, illustration_url, trivia_kids_text, trivia_adult_text, nutrition_summary)
select im.id, v.rarity, v.illustration_url, v.trivia_kids_text, v.trivia_adult_text, v.nutrition_summary
from (values
  ('舞茸', 'normal', '舞茸.jpg',
   '触感{しょっかん}が 楽{たの}しい きのこ!炒{いた}めても 汁物{しるもの}に 入{い}れても 美味{おい}しいよ。',
   '香{かお}りと 歯{は}ごたえが 良{よ}く、天{てん}ぷらや 炊{た}き込{こ}みご飯{はん}にも 合{あ}う。ビタミンDや 食物繊維{しょくもつせんい}が 豊富{ほうふ}。',
   'ビタミンD、食物繊維{しょくもつせんい}、ナイアシン'),
  ('エリンギ', 'normal', 'エリンギ.jpg',
   'コリコリした 歯{は}ごたえが 人気{にんき}の きのこだよ。バター焼{や}きが 美味{おい}しい!',
   '肉厚{にくあつ}な 軸{じく}が 特徴{とくちょう}で、加熱{かねつ}しても 食感{しょっかん}が 残{のこ}りやすい。食物繊維{しょくもつせんい}や カリウムを 含{ふく}む。',
   '食物繊維{しょくもつせんい}、カリウム、ビタミンB群{ぐん}'),
  ('水菜', 'normal', '水菜.jpg',
   'シャキシャキした 葉{は}っぱの 野菜{やさい}。サラダや 鍋{なべ}に 入{い}れて 食{た}べるよ。',
   '京野菜{きょうやさい}の ひとつで、クセが 少{すく}なく サラダにも 鍋{なべ}にも 使{つか}いやすい。ビタミンCや カルシウムが 豊富{ほうふ}。',
   'ビタミンC、カルシウム、鉄{てつ}'),
  ('豆苗', 'normal', '豆苗.jpg',
   '豆{まめ}から 出{で}た 芽{め}を 食{た}べる 野菜{やさい}。切{き}ってもまた 生{は}えてくるよ!',
   'エンドウ豆{まめ}の 若{わか}い 芽{め}を 食{た}べる 野菜{やさい}で、根元{ねもと}を 水{みず}に つけると 再収穫{さいしゅうかく}できる。βカロテンや ビタミンKが 豊富{ほうふ}。',
   'βカロテン、ビタミンK、ビタミンC'),
  ('ツナ缶', 'normal', 'ツナ缶.jpg',
   'まぐろや かつおを 油{あぶら}や 水{みず}で 缶詰{かんづめ}に した もの。そのまま 食{た}べても サラダに 乗{の}せても 美味{おい}しいよ。',
   '常温保存{じょうおんほぞん}が できて 調理{ちょうり}も 手軽{てがる}なので、常備菜{じょうびさい}として 人気{にんき}。たんぱく質{しつ}と DHA・EPAが 豊富{ほうふ}。',
   'たんぱく質{しつ}、DHA、EPA')
) as v(name, rarity, illustration_url, trivia_kids_text, trivia_adult_text, nutrition_summary)
join public.ingredients_master im on im.name = v.name
where not exists (
  select 1 from public.game_cards gc where gc.ingredient_id = im.id
);
