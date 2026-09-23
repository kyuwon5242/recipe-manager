// ゲーム要素(食材カード)関連の共通定義。design: game-design.md

export const CARD_RARITIES = ["normal", "rare", "super_rare", "legendary"] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const RARITY_LABELS: Record<CardRarity, string> = {
  normal: "ノーマル",
  rare: "レア",
  super_rare: "スーパーレア",
  legendary: "レジェンド",
};

// カードの枠の色(イラストは1食材1枚のみ用意し、レアリティはこの枠・背景・星で表現する)
export const RARITY_STYLES: Record<
  CardRarity,
  { border: string; badgeBg: string; badgeText: string; imageBg: string; glow: string; stars: number }
> = {
  normal: {
    border: "border-gray-300",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-600",
    imageBg: "bg-gray-100",
    glow: "",
    stars: 1,
  },
  rare: {
    border: "border-sky-400",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
    imageBg: "bg-gradient-to-br from-sky-50 to-sky-200",
    glow: "shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    stars: 2,
  },
  super_rare: {
    border: "border-violet-400",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    imageBg: "bg-gradient-to-br from-violet-50 to-violet-200",
    glow: "shadow-[0_0_14px_rgba(167,139,250,0.4)]",
    stars: 3,
  },
  legendary: {
    border: "border-amber-400",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    imageBg: "bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200",
    glow: "shadow-[0_0_18px_rgba(251,191,36,0.5)]",
    stars: 4,
  },
};

const MAX_RARITY_STARS = 4;

// レアリティを★(獲得段階数)+☆(残り)で表現する(例: レア=★★☆☆)
export function rarityStars(rarity: CardRarity): string {
  const { stars } = RARITY_STYLES[rarity];
  return "★".repeat(stars) + "☆".repeat(MAX_RARITY_STARS - stars);
}

export function monthsLabel(months: number[] | null): string {
  if (!months || months.length === 0) return "通年・不明";
  return months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => `${m}月`)
    .join("・");
}
