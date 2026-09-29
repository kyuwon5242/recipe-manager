// 家族ランク(design: game-design.md 4.5節)。
// 家族が「達成」したレシピの種類数(=family_dishesの件数、distinctなrecipe_id数)に応じた7段階。
// 2026-09-29、カード充足レシピの目標数を100種→50種に変更したことに伴い、閾値も半分の規模に再設計
// (料理長を中心とした山型の配分〈幅5,8,10,12,8,5,3〉は100種版の閾値〈幅10,15,20,25,15,10,6〉の比率を踏襲)。
export const MAX_DISH_COUNT = 50;

export type FamilyRank = {
  label: string;
  min: number;
};

export const FAMILY_RANKS: FamilyRank[] = [
  { label: "駆け出しシェフ", min: 0 },
  { label: "中堅シェフ", min: 5 },
  { label: "ベテランシェフ", min: 13 },
  { label: "料理長", min: 23 },
  { label: "ミシュランシェフ☆", min: 35 },
  { label: "ミシュランシェフ☆☆", min: 43 },
  { label: "ミシュランシェフ☆☆☆", min: 48 },
];

export type FamilyRankStatus = {
  rank: FamilyRank;
  rankIndex: number;
  achievedCount: number;
  nextRank: FamilyRank | null;
  toNextRank: number | null;
};

export function getFamilyRankStatus(achievedCount: number): FamilyRankStatus {
  const count = Math.max(0, achievedCount);
  let rankIndex = 0;
  for (let i = 0; i < FAMILY_RANKS.length; i++) {
    if (count >= FAMILY_RANKS[i].min) rankIndex = i;
  }
  const rank = FAMILY_RANKS[rankIndex];
  const nextRank = FAMILY_RANKS[rankIndex + 1] ?? null;

  return {
    rank,
    rankIndex,
    achievedCount: count,
    nextRank,
    toNextRank: nextRank ? nextRank.min - count : null,
  };
}
