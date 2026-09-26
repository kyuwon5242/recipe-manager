// ゲーム要素(食材カード)関連の共通定義。design: game-design.md
//
// カードの見た目は2軸で表現する(実際の描画は components/GameCardVisual.tsx と
// globals.css の .game-card-*):
// - カテゴリ(食材の種類)→ 縁取り・背景の色相(魚介=青、野菜・果物=緑 など)
// - レアリティ → 縁・背景の濃さ(上位ほど濃い)と光り方
//   (SR以上: 白い光が走る / レジェンドのみ: 虹色ホロ・きらめき・脈打つ光彩・金の内枠)
// 色相と「特別感」を別の軸に分けることで、両方を重ねても意味が混ざらないようにしている。

// 【暫定】ガチャ実装(フェーズB)が完了するまで、未入手のカードも図鑑で
// イラスト・詳細つきで閲覧できるようにする。ガチャ実装時はfalseにする(または削除する)。
export const REVEAL_ALL_CARDS_UNTIL_GACHA = true;

export const CARD_RARITIES = ["normal", "rare", "super_rare", "legendary"] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const RARITY_LABELS: Record<CardRarity, string> = {
  normal: "ノーマル",
  rare: "レア",
  super_rare: "スーパーレア",
  legendary: "レジェンド",
};

// ★の数(獲得段階)とカード上の略称チップ
export const RARITY_STARS: Record<CardRarity, number> = {
  normal: 1,
  rare: 2,
  super_rare: 3,
  legendary: 4,
};

export const RARITY_CODES: Record<CardRarity, string> = {
  normal: "N",
  rare: "R",
  super_rare: "SR",
  legendary: "UR",
};

// カードのCSSクラス(globals.css の .game-card-frame.n/.r/.s/.u に対応)
export const RARITY_CARD_CLASSES: Record<CardRarity, string> = {
  normal: "n",
  rare: "r",
  super_rare: "s",
  legendary: "u",
};

// バッジ(「ノーマル」等のピル)はレアリティごとに色を変えて一覧性を保つ
// (カード全体の色相はカテゴリ側が担うため、バッジだけの小さな差別化)。
export const RARITY_BADGE_STYLES: Record<CardRarity, { bg: string; text: string }> = {
  normal: { bg: "bg-gray-100", text: "text-gray-600" },
  rare: { bg: "bg-sky-100", text: "text-sky-700" },
  super_rare: { bg: "bg-violet-100", text: "text-violet-700" },
  legendary: { bg: "bg-amber-100", text: "text-amber-700" },
};

const MAX_RARITY_STARS = 4;

// レアリティを★(獲得段階数)+☆(残り)で表現する(例: レア=★★☆☆)
export function rarityStars(rarity: CardRarity): string {
  const stars = RARITY_STARS[rarity];
  return "★".repeat(stars) + "☆".repeat(MAX_RARITY_STARS - stars);
}

// h = 色相(0-360)、k = 彩度係数(1で通常、小さいほどグレー寄り)。
// 食育の観点で「魚は青、野菜は緑」のように直感的に食材のグループが分かるようにする。
export type CategoryCardHue = { h: number; k: number };

const CATEGORY_CARD_HUES: Record<string, CategoryCardHue> = {
  "野菜・果物": { h: 135, k: 1 },
  肉: { h: 352, k: 1 },
  魚介: { h: 205, k: 1 },
  "卵・乳製品": { h: 48, k: 1 },
  "豆腐・大豆製品": { h: 24, k: 1 },
  "米・パン・麺": { h: 36, k: 0.9 },
  "調味料・油": { h: 275, k: 1 },
  "粉類・乾物・缶詰": { h: 30, k: 0.25 },
  冷凍食品: { h: 186, k: 1 },
  その他: { h: 220, k: 0.12 },
};

const UNCATEGORIZED_CARD_HUE: CategoryCardHue = { h: 220, k: 0.12 };

export function categoryCardHue(category: string): CategoryCardHue {
  return CATEGORY_CARD_HUES[category] ?? UNCATEGORIZED_CARD_HUE;
}

export function monthsLabel(months: number[] | null): string {
  if (!months || months.length === 0) return "通年・不明";
  return months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => `${m}月`)
    .join("・");
}

// 漢字が含まれる名前だけルビ(ふりがな)を表示する(ひらがな・カタカナのみの
// 名前は読みが自明なので、実際の紙の食育カードと同じくルビを付けない)。
const KANJI_PATTERN = /[一-龯]/;

export function needsFurigana(name: string, reading: string | null): reading is string {
  return Boolean(reading) && KANJI_PATTERN.test(name);
}
