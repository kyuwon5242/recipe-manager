// ゲーム要素(食材カード)関連の共通定義。design: game-design.md

export const CARD_RARITIES = ["normal", "rare", "super_rare", "legendary"] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const RARITY_LABELS: Record<CardRarity, string> = {
  normal: "ノーマル",
  rare: "レア",
  super_rare: "スーパーレア",
  legendary: "レジェンド",
};

// カードの枠の色(イラストは1食材1枚のみ用意し、レアリティはこの枠で表現する)
export const RARITY_STYLES: Record<CardRarity, { border: string; badgeBg: string; badgeText: string }> = {
  normal: { border: "border-gray-300", badgeBg: "bg-gray-100", badgeText: "text-gray-600" },
  rare: { border: "border-sky-400", badgeBg: "bg-sky-100", badgeText: "text-sky-700" },
  super_rare: { border: "border-violet-400", badgeBg: "bg-violet-100", badgeText: "text-violet-700" },
  legendary: { border: "border-amber-400", badgeBg: "bg-amber-100", badgeText: "text-amber-700" },
};

export function monthsLabel(months: number[] | null): string {
  if (!months || months.length === 0) return "通年・不明";
  return months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => `${m}月`)
    .join("・");
}

// カード画像は public/cards/ 配下に静的ファイルとして配置する想定
// (game-design.md 8章参照)。未設定の場合はプレースホルダーを表示する。
export function cardImageSrc(illustrationUrl: string | null): string | null {
  if (!illustrationUrl) return null;
  return `/cards/${illustrationUrl}`;
}
