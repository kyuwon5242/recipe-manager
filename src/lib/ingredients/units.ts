// 食材リスト作成時、レシピごとに単位表記が異なる(大さじ/小さじ、g/kgなど)
// 場合でも同じ食材として数量を合算できるようにするための単位変換。
// 「1本」「1個」のような個数単位は食材ごとに重さが違い機械的な換算ができない
// ため対象外とし、そのまま独立した数量として扱う(呼び出し側で同じ食材名の
// 別セグメントとしてまとめて表示する)。

export type UnitGroup = "weight" | "volume";

const WEIGHT_UNIT_FACTORS: Record<string, number> = {
  g: 1,
  グラム: 1,
  kg: 1000,
  キログラム: 1000,
};

const VOLUME_UNIT_FACTORS: Record<string, number> = {
  ml: 1,
  cc: 1,
  ミリリットル: 1,
  l: 1000,
  L: 1000,
  リットル: 1000,
  大さじ: 15,
  小さじ: 5,
  カップ: 200,
};

export function normalizeUnit(unit: string | null): { group: UnitGroup; factor: number } | null {
  if (!unit) return null;
  const trimmed = unit.trim();
  if (trimmed in WEIGHT_UNIT_FACTORS) {
    return { group: "weight", factor: WEIGHT_UNIT_FACTORS[trimmed] };
  }
  if (trimmed in VOLUME_UNIT_FACTORS) {
    return { group: "volume", factor: VOLUME_UNIT_FACTORS[trimmed] };
  }
  return null;
}

function round(value: number, digits: number): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

// 基準単位(重量=g, 体積=ml)の合計値を、買い物リストとして読みやすい単位に
// 変換する。合算後は「大さじ◯」に戻さずg/ml(または大きければkg/L)で表示する
// (複数レシピ分を合算した後は元のさじ数に戻すとかえって分かりにくいため)。
export function formatBaseQuantity(
  group: UnitGroup,
  baseValue: number
): { quantity: number; unit: string } {
  if (group === "weight") {
    return baseValue >= 1000
      ? { quantity: round(baseValue / 1000, 2), unit: "kg" }
      : { quantity: round(baseValue, 1), unit: "g" };
  }
  return baseValue >= 1000
    ? { quantity: round(baseValue / 1000, 2), unit: "L" }
    : { quantity: round(baseValue, 1), unit: "ml" };
}
