// 料理図鑑(game-design.md 10章)の対象50品。食材図鑑のカードだけで作れる
// 「各国の王道・日常的な料理」として、0036_default_recipes_fifty_dishes.sql で
// 新規家族のデフォルトレシピとして整備したものと同じ50品・同じタイトル文字列。
// タイトルで`recipes.title`と突き合わせて達成状況を判定するため、
// 0036マイグレーションのタイトルと完全に一致させること。
export type DishCatalogEntry = {
  title: string;
  category: string;
  genre: "主食" | "主菜" | "副菜" | "汁物";
};

export const DISH_CATALOG: DishCatalogEntry[] = [
  { title: "親子丼", category: "和食", genre: "主食" },
  { title: "タコライス", category: "和食", genre: "主食" },
  { title: "カレーライス", category: "和食", genre: "主食" },
  { title: "カルボナーラ", category: "洋食", genre: "主食" },
  { title: "オムライス", category: "洋食", genre: "主食" },
  { title: "ナポリタン", category: "洋食", genre: "主食" },
  { title: "チャーハン", category: "中華", genre: "主食" },
  { title: "担々麺", category: "中華", genre: "主食" },
  { title: "天津飯", category: "中華", genre: "主食" },
  { title: "ビビンバ", category: "韓国", genre: "主食" },
  { title: "キンパ", category: "韓国", genre: "主食" },
  { title: "ガパオライス", category: "タイ", genre: "主食" },
  { title: "チキンビリヤニ", category: "インド", genre: "主食" },
  { title: "豚の生姜焼き", category: "和食", genre: "主菜" },
  { title: "ぶり大根", category: "和食", genre: "主菜" },
  { title: "すき焼き", category: "和食", genre: "主菜" },
  { title: "ハンバーグ", category: "洋食", genre: "主菜" },
  { title: "サーロインステーキ", category: "洋食", genre: "主菜" },
  { title: "サーモンのムニエル", category: "洋食", genre: "主菜" },
  { title: "青椒肉絲", category: "中華", genre: "主菜" },
  { title: "エビチリ", category: "中華", genre: "主菜" },
  { title: "麻婆豆腐", category: "中華", genre: "主菜" },
  { title: "プルコギ", category: "韓国", genre: "主菜" },
  { title: "タッカルビ", category: "韓国", genre: "主菜" },
  { title: "アボカドタコス", category: "メキシコ", genre: "主菜" },
  { title: "きんぴらごぼう", category: "和食", genre: "副菜" },
  { title: "ほうれん草の胡麻和え", category: "和食", genre: "副菜" },
  { title: "筑前煮", category: "和食", genre: "副菜" },
  { title: "キャベツの浅漬け", category: "和食", genre: "副菜" },
  { title: "カプレーゼ", category: "洋食", genre: "副菜" },
  { title: "ポテトサラダ", category: "洋食", genre: "副菜" },
  { title: "ラタトゥイユ", category: "洋食", genre: "副菜" },
  { title: "バンバンジー", category: "中華", genre: "副菜" },
  { title: "麻婆茄子", category: "中華", genre: "副菜" },
  { title: "中華風叩ききゅうり", category: "中華", genre: "副菜" },
  { title: "ほうれん草のナムル", category: "韓国", genre: "副菜" },
  { title: "大根のナムル", category: "韓国", genre: "副菜" },
  { title: "ベトナム風生春巻きサラダ", category: "ベトナム", genre: "副菜" },
  { title: "あさりの味噌汁", category: "和食", genre: "汁物" },
  { title: "豚汁", category: "和食", genre: "汁物" },
  { title: "豆腐とねぎの味噌汁", category: "和食", genre: "汁物" },
  { title: "かぼちゃのポタージュ", category: "洋食", genre: "汁物" },
  { title: "ミネストローネ", category: "洋食", genre: "汁物" },
  { title: "コンソメスープ", category: "洋食", genre: "汁物" },
  { title: "中華風たまごスープ", category: "中華", genre: "汁物" },
  { title: "酸辣湯", category: "中華", genre: "汁物" },
  { title: "豆腐と白菜の中華スープ", category: "中華", genre: "汁物" },
  { title: "キムチチゲ", category: "韓国", genre: "汁物" },
  { title: "もやしスープ", category: "韓国", genre: "汁物" },
  { title: "ブイヤベース風魚介スープ", category: "フランス", genre: "汁物" },
];
