// ゲーム要素(食材カード)関連の共通定義。design: game-design.md
//
// カードの見た目は2軸で表現する:
// - カテゴリ(食材の種類)→ 背景色の色相(魚介=青、野菜・果物=緑 など)
// - レアリティ → 光り方・キラキラ度合い(枠の光彩・シマー演出・★の数)
// 色相と「特別感」を別の軸に分けることで、両方を重ねても意味が混ざらないようにしている。

export const CARD_RARITIES = ["normal", "rare", "super_rare", "legendary"] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const RARITY_LABELS: Record<CardRarity, string> = {
  normal: "ノーマル",
  rare: "レア",
  super_rare: "スーパーレア",
  legendary: "レジェンド",
};

export type RarityEffect = {
  ring: string;
  glow: string;
  shimmer: boolean;
  shimmerDuration: string;
  pulse: boolean;
  stars: number;
};

// レアリティは色相を持たせず(色相はカテゴリ側の役割)、光彩・シマーアニメーション・
// ★の数だけで「特別感」の強さを表現する。上位ほど光り方が強く速くなる。
export const RARITY_EFFECTS: Record<CardRarity, RarityEffect> = {
  normal: {
    ring: "",
    glow: "",
    shimmer: false,
    shimmerDuration: "0s",
    pulse: false,
    stars: 1,
  },
  rare: {
    ring: "ring-2 ring-white",
    glow: "shadow-[0_0_10px_rgba(255,255,255,0.6)]",
    shimmer: true,
    shimmerDuration: "3.5s",
    pulse: false,
    stars: 2,
  },
  super_rare: {
    ring: "ring-2 ring-white",
    glow: "shadow-[0_0_16px_rgba(250,204,21,0.55)]",
    shimmer: true,
    shimmerDuration: "2.5s",
    pulse: false,
    stars: 3,
  },
  legendary: {
    ring: "ring-4 ring-amber-300",
    glow: "shadow-[0_0_24px_rgba(250,204,21,0.75)]",
    shimmer: true,
    shimmerDuration: "1.6s",
    pulse: true,
    stars: 4,
  },
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
  const { stars } = RARITY_EFFECTS[rarity];
  return "★".repeat(stars) + "☆".repeat(MAX_RARITY_STARS - stars);
}

export type CategoryCardStyle = { bg: string; border: string; text: string };

// 食材カテゴリごとのカード色相(食育の観点で「魚は青、野菜は緑」のように
// 直感的に食材のグループが分かるようにする)。
const CATEGORY_CARD_STYLES: Record<string, CategoryCardStyle> = {
  "野菜・果物": { bg: "bg-gradient-to-br from-green-50 to-green-200", border: "border-green-300", text: "text-green-700" },
  肉: { bg: "bg-gradient-to-br from-rose-50 to-rose-200", border: "border-rose-300", text: "text-rose-700" },
  魚介: { bg: "bg-gradient-to-br from-sky-50 to-sky-200", border: "border-sky-300", text: "text-sky-700" },
  "卵・乳製品": { bg: "bg-gradient-to-br from-yellow-50 to-yellow-200", border: "border-yellow-300", text: "text-yellow-700" },
  "豆腐・大豆製品": { bg: "bg-gradient-to-br from-orange-50 to-orange-200", border: "border-orange-300", text: "text-orange-700" },
  "米・パン・麺": { bg: "bg-gradient-to-br from-amber-50 to-amber-200", border: "border-amber-300", text: "text-amber-700" },
  "調味料・油": { bg: "bg-gradient-to-br from-purple-50 to-purple-200", border: "border-purple-300", text: "text-purple-700" },
  "粉類・乾物・缶詰": { bg: "bg-gradient-to-br from-stone-50 to-stone-200", border: "border-stone-300", text: "text-stone-700" },
  冷凍食品: { bg: "bg-gradient-to-br from-cyan-50 to-cyan-200", border: "border-cyan-300", text: "text-cyan-700" },
  その他: { bg: "bg-gradient-to-br from-gray-50 to-gray-200", border: "border-gray-300", text: "text-gray-600" },
};

const UNCATEGORIZED_CARD_STYLE: CategoryCardStyle = {
  bg: "bg-gray-100",
  border: "border-gray-300",
  text: "text-gray-500",
};

export function categoryCardStyle(category: string): CategoryCardStyle {
  return CATEGORY_CARD_STYLES[category] ?? UNCATEGORIZED_CARD_STYLE;
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
