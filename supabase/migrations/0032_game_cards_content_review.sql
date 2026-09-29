-- 食材図鑑カードの内容レビュー(2026-09-29)
-- 1. トーン不統一の是正: 後から追加された5食材(舞茸・エリンギ・水菜・豆苗・ツナ缶)は
--    他のカードと違い、栄養効果の言及や「選び方」のヒントが無い淡白な文章だったため、
--    既存94件と同じトーン(元気な語り口+栄養効果+選び方)に全文書き直し。
-- 2. 栄養説明と本文の内容不一致を修正(松茸・初ガツオ・玉ねぎ)。
-- 3. 誤りの可能性がある栄養素名を修正(みかんの「シネフィリン」→「βクリプトキサンチン」)。
-- 4. マニアックな栄養素名に一言説明を追加(他カードの「アリシン(滋養強壮)」と同じ形式)。
-- 5. 実データの欠落を補完(木綿豆腐の読み仮名、エリンギの旬月)。
-- 6. CSVでのユーザーレビューで見つかった誤字・不自然な言い回しを修正
--    (A5和牛サーロインの読み間違い、初ガツオの重複表現、さくらんぼの事実誤りなど)。
-- 7. レアリティの再調整(28件。ノーマル中心のピラミッド型に是正)。
--
-- 備考: 旬(月)が未設定(season_months = null)の約30食材(肉・乳製品・調味料・
-- 通年出回る野菜など)は、レビューの結果あえてnullのまま維持する。ガチャの旬ブースト
-- (season_multiplier、0023参照)はnullなら「ブーストなし」の扱いになり、これは
-- 「年中出回るので旬による特別扱いをしない」という意図と一致するため。

-- ============================================================
-- 1. トーン統一のための全文書き直し
-- ============================================================
update public.game_cards gc set
  trivia_kids_text = '見{み}た目{め}はゴツゴツ、香{かお}りはふわっと豊{ゆた}か!秋{あき}の味覚{みかく}を代表{だいひょう}する「きのこの女王{じょおう}」',
  trivia_adult_text = '天{てん}ぷらや炊{た}き込{こ}みご飯{はん}にすると香{かお}りが引{ひ}き立{た}つよ!骨{ほね}を丈夫{じょうぶ}にするビタミンDと、お腹{なか}の掃除{そうじ}をする食物繊維{しょくもつせんい}がたっぷり。かさの色{いろ}が濃{こ}い灰色{はいいろ}〜黒{くろ}っぽく、株{かぶ}全体{ぜんたい}がしっかり締{し}まっているものが香{かお}り豊{ゆた}か!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '舞茸';

update public.game_cards gc set
  trivia_kids_text = 'コリコリ・ムチムチの歯{は}ごたえ!大{おお}きな軸{じく}まで丸{まる}ごと美味{おい}しいきのこだよ',
  trivia_adult_text = 'バター焼{や}きやアヒージョにすると香{かお}ばしさが引{ひ}き立{た}つよ!お腹{なか}の調子{ちょうし}を整{ととの}える食物繊維{しょくもつせんい}と、疲{つか}れを取{と}るビタミンB群{ぐん}が摂{と}れるよ。軸{じく}が肉厚{にくあつ}でハリがあり、かさの部分{ぶぶん}が小{ちい}さく茶色{ちゃいろ}いものが新鮮{しんせん}!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'エリンギ';

update public.game_cards gc set
  trivia_kids_text = 'シャキシャキ・パリッと軽{かる}い歯{は}ごたえ!サラダにもお鍋{なべ}にも合{あ}う葉{は}っぱ野菜{やさい}だよ',
  trivia_adult_text = 'サラダや豚肉{ぶたにく}と一緒{いっしょ}にハリハリ鍋{なべ}にするとシャキシャキで美味{おい}しい!骨{ほね}を強{つよ}くするカルシウムと、風邪{かぜ}を防{ふせ}ぐビタミンCが豊富{ほうふ}。葉{は}っぱが濃{こ}い緑色{みどりいろ}でピンとしていて、茎{くき}が白{しろ}くみずみずしいものを選{えら}ぼう!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '水菜';

update public.game_cards gc set
  trivia_kids_text = 'ピンと伸{の}びたシャキシャキの若{わか}い芽{め}!根元{ねもと}を水{みず}につけておくとまた生{は}えてくる不思議{ふしぎ}な野菜{やさい}だよ',
  trivia_adult_text = 'サラダや豚肉{ぶたにく}炒{いた}めにするとシャキシャキで美味{おい}しい!お肌{はだ}や目{め}を元気{げんき}にするβカロテンと、骨{ほね}を強{つよ}くするビタミンKが豊富{ほうふ}。葉{は}っぱが濃{こ}い緑色{みどりいろ}でみずみずしく、根元{ねもと}が白{しろ}くしっかりしているものを選{えら}ぼう!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '豆苗';

update public.game_cards gc set
  trivia_kids_text = 'まぐろやかつおを缶詰{かんづめ}にした魚{さかな}のうまみパワー!そのままでもサラダに乗{の}せても美味{おい}しいよ',
  trivia_adult_text = 'サラダに乗{の}せたりパスタに和{あ}えるとすぐに一品{いっぴん}!体{からだ}を作{つく}るタンパク質{しつ}と、頭{あたま}の回転{かいてん}を助{たす}けるDHA・EPAが手軽{てがる}にとれるよ。常温{じょうおん}で長{なが}く保存{ほぞん}できるので、災害{さいがい}時{じ}の備{そな}えにもぴったり!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'ツナ缶';

-- ============================================================
-- 2. 栄養説明と本文の不一致を修正
-- ============================================================
update public.game_cards gc set
  trivia_adult_text = '松茸{まつたけ}ご飯{はん}や土瓶蒸{どびんむ}しにすると香{かお}りと出汁{だし}が引{ひ}き立{た}つよ!お腹{なか}の調子{ちょうし}を整{ととの}え、体{からだ}の余分{よぶん}な塩分{えんぶん}を出{だ}してくれるよ。かさがあきすぎておらず、軸{じく}が太{ふと}くしっかり硬{かた}いものが新鮮{しんせん}!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '松茸';

update public.game_cards gc set
  trivia_kids_text = 'モチモチした歯{は}ごたえ!さっぱりした味{あじ}が爽{そう}やかな春{はる}のお魚{さかな}',
  trivia_adult_text = '表面{ひょうめん}をサッと炙{あぶ}る「タタキ」にしてポン酢{す}で食{た}べると最高{さいこう}!血{ち}を作{つく}って貧血{ひんけつ}を防{ふせ}ぐ鉄分{てつぶん}がたっぷり入{はい}っているよ。身{み}に赤{あか}みとハリがあり、切{き}り口{ぐち}がシャキッと立{た}っているものを選{えら}ぼう!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '初ガツオ';

update public.game_cards gc set
  trivia_adult_text = 'じっくり炒{いた}めてスープやカレーに入{い}れると甘{あま}みとコクが段違{だんちが}い!血液{けつえき}をサラサラにして、元気{げんき}な体{からだ}を保{たも}ってくれるよ。頭頂部{とうちょうぶ}が固{かた}くキュッと締{し}まり、皮{かわ}が乾燥{かんそう}してツヤがあるものが良{よ}い!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '玉ねぎ';

-- ============================================================
-- 3. 誤りの可能性がある栄養素名を修正(みかん)
-- ============================================================
update public.game_cards gc set
  trivia_adult_text = '皮{かわ}をむいてそのまま食{た}べるのが手軽{てがる}で最高{さいこう}!ビタミンCで冬{ふゆ}の風邪{かぜ}バリアを作{つく}り、薄皮{うすかわ}や袋{ふくろ}にある骨{ほね}を守{まも}る栄養{えいよう}(βクリプトキサンチン)も摂{と}れるよ。皮{かわ}のオレンジ色{いろ}が濃{こ}く、皮{かわ}が薄{うす}くて身{み}にピタッと張{は}り付{つ}いているものが甘{あま}くてジューシー!',
  nutrition_summary = 'ビタミンC、βクリプトキサンチン'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'みかん';

-- ============================================================
-- 4. マニアックな栄養素名に一言説明を追加
-- ============================================================
update public.game_cards gc set nutrition_summary = 'タンパク質{しつ}、グリシン(安眠{あんみん})'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = '車エビ';

update public.game_cards gc set nutrition_summary = 'アスパラギン酸{さん}(疲労{ひろう}回復{かいふく})、葉酸{ようさん}'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = '初物アスパラガス';

update public.game_cards gc set nutrition_summary = '食物{しょくもつ}繊維{せんい}、チロシン(集中力{しゅうちゅうりょく})'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = '筍';

update public.game_cards gc set nutrition_summary = 'ビタミンD、グアニル酸{さん}(うま味{み}成分{せいぶん})'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = '生しいたけ';

update public.game_cards gc set nutrition_summary = '高{こう}タンパク、イミダペプチド(疲労{ひろう}回復{かいふく})'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = '鶏むね肉';

update public.game_cards gc set nutrition_summary = 'オルニチン(肝臓{かんぞう}サポート)、ビタミンD'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = 'しめじ';

update public.game_cards gc set nutrition_summary = 'ポリフェノール、硫化{りゅうか}アリル(血液{けつえき}サラサラ)'
from public.ingredients_master im where gc.ingredient_id = im.id and im.name = '玉ねぎ';

-- ============================================================
-- 5. 実データの欠落を補完
-- ============================================================
update public.ingredients_master
set reading = 'もめんどうふ'
where name = '木綿豆腐' and reading is null;

update public.ingredients_master
set season_months = array[9,10,11]
where name = 'エリンギ' and season_months is null;

-- ============================================================
-- 6. CSVレビューで見つかった誤字・不自然な言い回しの修正
-- ============================================================
update public.game_cards gc set
  trivia_adult_text = 'ステーキや焼き肉{にく}でサッと焼{や}いて食{た}べると絶品{ぜっぴん}!血{ち}を作{つく}って体{からだ}を元気{げんき}にし、力強{ちからづよ}い筋肉{きんにく}を作{つく}ってくれるよ。赤身{あかみ}の中{なか}に白{しろ}い脂{あぶら}(霜降{しもふ}り)が網目{あみめ}のように細{こま}かく入{はい}っているものが最高級{さいこうきゅう}!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'A5和牛サーロイン';

update public.game_cards gc set
  trivia_kids_text = 'プチッと弾{はじ}けて甘酸{あまず}っぱい果汁{かじゅう}がジュワッ!ルビーみたいに可愛{かわい}い赤{あか}い果実{かじつ}'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'さくらんぼ';

update public.game_cards gc set
  trivia_adult_text = '筍{たけのこ}ご飯{はん}や煮物{にもの}にすると季節{きせつ}の風味{ふうみ}を楽{たの}しめるよ!お腹{なか}の中{なか}を掃除{そうじ}して便秘{べんぴ}を防{ふせ}ぎ、脳{のう}の働{はたら}きを活発{かつはつ}にしてくれるよ。皮{かわ}がツヤのある薄茶色{うすちゃいろ}で、ずっしり重{おも}く穂先{ほさき}が緑色{りょくしょく}になっていないものがアクが少{すく}ない!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '筍';

update public.game_cards gc set
  trivia_adult_text = 'マグロと一緒{いっしょ}にポキ丼{どん}にしたりサラダに入{い}れると最高{さいこう}!お肌{はだ}をスベスベにして、血液{けつえき}をキレイに保{たも}つサポートをするよ。皮{かわ}が黒{くろ}っぽく変色{へんしょく}していて、ヘタと皮{かわ}の間{あいだ}に隙間{すきま}がなく少{すこ}し弾力{だんりょく}があるものが食{た}べ頃{ごろ}!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'アボカド';

update public.game_cards gc set
  trivia_kids_text = '旨味{うまみ}と風味{ふうみ}しっかり!牛丼{ぎゅうどん}やすき焼{や}きにすると最高{さいこう}のご馳走{ちそう}'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '牛肉（薄切り）';

update public.game_cards gc set
  trivia_adult_text = 'そのまま飲{の}んだりシチューやスープに入{い}れるとまろやか!骨{ほね}や歯{は}を強{つよ}くして背{せ}を伸{の}ばすカルシウムの王様{おうさま}。賞味{しょうみ}期限{きげん}が新{あたら}しいものを選{えら}び、開{ひら}けたら早{はや}めに美味{おいし}しく飲{の}み干{ほ}そう!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = '牛乳';

update public.game_cards gc set
  trivia_adult_text = 'お味噌汁{みそしる}やお肉{にく}の味噌{みそ}焼{や}きにすると旨味{うまみ}が倍増{ばいぞう}!お腹{なか}の調子{ちょうし}を整{ととの}えて、病気{びょうき}に負{ま}けない強{つよ}い体{からだ}を作{つく}ってくれるよ。風味{ふうみ}良{よ}くてツヤがあり、しっかり熟成{じゅくせい}された香{かお}りがするものを選{えら}ぼう!'
from public.ingredients_master im
where gc.ingredient_id = im.id and im.name = 'みそ';

-- ============================================================
-- 7. レアリティの再調整(28件)
-- ============================================================
update public.game_cards gc set rarity = v.rarity
from (values
  ('トマト', 'normal'),
  ('ズワイガニ', 'super_rare'),
  ('うに', 'super_rare'),
  ('シャインマスカット', 'super_rare'),
  ('初ガツオ', 'rare'),
  ('あわび', 'legendary'),
  ('サンマ', 'rare'),
  ('ぶり', 'rare'),
  ('牡蠣', 'rare'),
  ('生ハム', 'normal'),
  ('ゴーヤー', 'normal'),
  ('ズッキーニ', 'normal'),
  ('ビーツ', 'rare'),
  ('ライチ', 'rare'),
  ('栗', 'rare'),
  ('オクラ', 'normal'),
  ('かぼちゃ', 'normal'),
  ('ナス', 'normal'),
  ('パプリカ', 'normal'),
  ('れんこん', 'normal'),
  ('ごぼう', 'normal'),
  ('ほうれん草', 'normal'),
  ('ブロッコリー', 'normal'),
  ('さつまいも', 'normal'),
  ('にんにく', 'normal'),
  ('しょうが', 'normal'),
  ('レモン', 'normal'),
  ('ごま油', 'normal')
) as v(name, rarity)
join public.ingredients_master im on im.name = v.name
where gc.ingredient_id = im.id;
