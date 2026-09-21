-- 新しい家族を作成したときに、代表的なレシピ6品(和食・洋食・中華 各2品、
-- 主食・主菜・副菜・汁物が一通り揃うように選定)を自動で登録する。
-- 空の状態から始まる新規家族の最初の一歩を後押しする狙い(バックログ
-- 「初期登録時のデフォルトレシピ設定」への対応)。
--
-- create_family() は auth.uid() を持つ認証済みセッションから呼ばれる
-- ため、recipes.created_by/updated_byは既存のset_recipe_created_by/
-- set_recipe_updated_byトリガーが自動設定する(明示指定は不要)。

create or replace function public.create_family(family_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family public.families;
  recipe_id uuid;
begin
  insert into public.families (name, owner_id)
  values (family_name, auth.uid())
  returning * into new_family;

  insert into public.family_members (family_id, user_id, role)
  values (new_family.id, auth.uid(), 'owner');

  -- 食材マスタ(家族を跨いで共有)に、デフォルトレシピで使う食材を
  -- まとめて登録する。既に存在する場合は何もしない。
  insert into public.ingredients_master (name, category)
  values
    ('豚ロース肉(生姜焼き用)', '肉'),
    ('玉ねぎ', '野菜・果物'),
    ('しょうが', '野菜・果物'),
    ('醤油', '調味料・油'),
    ('みりん', '調味料・油'),
    ('サラダ油', '調味料・油'),
    ('木綿豆腐', '豆腐・大豆製品'),
    ('乾燥わかめ', '粉類・乾物・缶詰'),
    ('味噌', '調味料・油'),
    ('顆粒和風だし', '調味料・油'),
    ('鶏もも肉', '肉'),
    ('ご飯', '米・パン・麺'),
    ('ケチャップ', '調味料・油'),
    ('バター', '卵・乳製品'),
    ('塩こしょう', '調味料・油'),
    ('キャベツ', '野菜・果物'),
    ('人参', '野菜・果物'),
    ('コーン缶', '粉類・乾物・缶詰'),
    ('マヨネーズ', '調味料・油'),
    ('酢', '調味料・油'),
    ('塩', '調味料・油'),
    ('豚肉(細切り)', '肉'),
    ('ピーマン', '野菜・果物'),
    ('たけのこ(水煮)', '粉類・乾物・缶詰'),
    ('オイスターソース', '調味料・油'),
    ('片栗粉', '粉類・乾物・缶詰'),
    ('ごま油', '調味料・油'),
    ('卵', '卵・乳製品'),
    ('鶏がらスープの素', '調味料・油'),
    ('万能ねぎ', '野菜・果物'),
    ('水', 'その他')
  on conflict (name) do nothing;

  -- 1. 豚肉の生姜焼き(和食・主菜)
  insert into public.recipes (title, category, genre, servings, instructions, family_id)
  values (
    '豚肉の生姜焼き', '和食', '主菜', 2,
    '1. 豚肉に軽く塩こしょうする。' || chr(10) ||
    '2. 玉ねぎを薄切りにする。' || chr(10) ||
    '3. しょうが・醤油・みりんを混ぜてタレを作る。' || chr(10) ||
    '4. フライパンに油を熱し、玉ねぎ→豚肉の順に炒める。' || chr(10) ||
    '5. タレを加えて絡めたら完成。',
    new_family.id
  )
  returning id into recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select recipe_id, id, v.quantity, v.unit
  from public.ingredients_master
  join (values
    ('豚ロース肉(生姜焼き用)', 200::numeric, 'g'),
    ('玉ねぎ', 0.5, '個'),
    ('しょうが', null, '大さじ1'),
    ('醤油', null, '大さじ2'),
    ('みりん', null, '大さじ2'),
    ('サラダ油', null, '大さじ1')
  ) as v(name, quantity, unit) on ingredients_master.name = v.name;

  -- 2. 豆腐とわかめの味噌汁(和食・汁物)
  insert into public.recipes (title, category, genre, servings, instructions, family_id)
  values (
    '豆腐とわかめの味噌汁', '和食', '汁物', 2,
    '1. 鍋に水とだしを入れて煮立てる。' || chr(10) ||
    '2. 豆腐を角切りにして加える。' || chr(10) ||
    '3. わかめを加えて温める。' || chr(10) ||
    '4. 火を弱め、味噌を溶き入れたら完成。',
    new_family.id
  )
  returning id into recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select recipe_id, id, v.quantity, v.unit
  from public.ingredients_master
  join (values
    ('木綿豆腐', 0.5::numeric, '丁'),
    ('乾燥わかめ', null, '大さじ1'),
    ('味噌', null, '大さじ2'),
    ('顆粒和風だし', null, '小さじ1'),
    ('水', 400, 'ml')
  ) as v(name, quantity, unit) on ingredients_master.name = v.name;

  -- 3. チキンライス(洋食・主食)
  insert into public.recipes (title, category, genre, servings, instructions, family_id)
  values (
    'チキンライス', '洋食', '主食', 2,
    '1. 鶏肉と玉ねぎを1cm角に切る。' || chr(10) ||
    '2. フライパンにバターを溶かし、鶏肉・玉ねぎを炒める。' || chr(10) ||
    '3. ご飯を加えて炒め合わせる。' || chr(10) ||
    '4. ケチャップを加えて味付けし、塩こしょうで調えたら完成。',
    new_family.id
  )
  returning id into recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select recipe_id, id, v.quantity, v.unit
  from public.ingredients_master
  join (values
    ('鶏もも肉', 150::numeric, 'g'),
    ('玉ねぎ', 0.5, '個'),
    ('ご飯', 2, '膳'),
    ('ケチャップ', null, '大さじ4'),
    ('バター', 10, 'g'),
    ('塩こしょう', null, '少々')
  ) as v(name, quantity, unit) on ingredients_master.name = v.name;

  -- 4. コールスローサラダ(洋食・副菜)
  insert into public.recipes (title, category, genre, servings, instructions, family_id)
  values (
    'コールスローサラダ', '洋食', '副菜', 2,
    '1. キャベツと人参を千切りにし、塩をふって少し置く。' || chr(10) ||
    '2. 水気をよく絞る。' || chr(10) ||
    '3. コーン、マヨネーズ、酢と和えたら完成。',
    new_family.id
  )
  returning id into recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select recipe_id, id, v.quantity, v.unit
  from public.ingredients_master
  join (values
    ('キャベツ', 0.25::numeric, '個'),
    ('人参', 0.33, '本'),
    ('コーン缶', null, '大さじ3'),
    ('マヨネーズ', null, '大さじ3'),
    ('酢', null, '小さじ1'),
    ('塩', null, '少々')
  ) as v(name, quantity, unit) on ingredients_master.name = v.name;

  -- 5. 青椒肉絲(中華・主菜)
  insert into public.recipes (title, category, genre, servings, instructions, family_id)
  values (
    '青椒肉絲(チンジャオロース)', '中華', '主菜', 2,
    '1. 豚肉、ピーマン、たけのこを細切りにする。' || chr(10) ||
    '2. 豚肉に片栗粉をまぶす。' || chr(10) ||
    '3. フライパンにごま油を熱し、豚肉を炒める。' || chr(10) ||
    '4. ピーマン、たけのこを加えて炒める。' || chr(10) ||
    '5. 醤油とオイスターソースで味付けしたら完成。',
    new_family.id
  )
  returning id into recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select recipe_id, id, v.quantity, v.unit
  from public.ingredients_master
  join (values
    ('豚肉(細切り)', 150::numeric, 'g'),
    ('ピーマン', 3, '個'),
    ('たけのこ(水煮)', 80, 'g'),
    ('醤油', null, '大さじ1'),
    ('オイスターソース', null, '大さじ1'),
    ('片栗粉', null, '小さじ1'),
    ('ごま油', null, '小さじ1')
  ) as v(name, quantity, unit) on ingredients_master.name = v.name;

  -- 6. 中華風たまごスープ(中華・汁物)
  insert into public.recipes (title, category, genre, servings, instructions, family_id)
  values (
    '中華風たまごスープ', '中華', '汁物', 2,
    '1. 鍋に水と鶏がらスープの素を入れて煮立てる。' || chr(10) ||
    '2. 水溶き片栗粉でとろみをつける。' || chr(10) ||
    '3. 溶き卵を回し入れる。' || chr(10) ||
    '4. 仕上げにごま油をたらし、ねぎを散らしたら完成。',
    new_family.id
  )
  returning id into recipe_id;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select recipe_id, id, v.quantity, v.unit
  from public.ingredients_master
  join (values
    ('卵', 1::numeric, '個'),
    ('鶏がらスープの素', null, '小さじ2'),
    ('水', 400, 'ml'),
    ('片栗粉', null, '小さじ1(水溶き用)'),
    ('ごま油', null, '少々'),
    ('万能ねぎ', null, '適量')
  ) as v(name, quantity, unit) on ingredients_master.name = v.name;

  return new_family;
end;
$$;
