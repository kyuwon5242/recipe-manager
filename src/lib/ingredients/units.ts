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

// 「1個」「2本」のように個数で数える単位。手入力の手間とばらつきを減らす
// ため、これらの単位が選ばれているときは分量を<select>の選択式にする
// (g/ml等の連続値は選択肢を固定できないため対象外)。
export const COUNT_UNITS = [
  "個",
  "本",
  "枚",
  "切れ",
  "尾",
  "匹",
  "玉",
  "株",
  "房",
  "袋",
  "缶",
  "丁",
  "束",
  "片",
  "粒",
  "パック",
  "合",
] as const;

// 個数単位の分量として選択肢に出す代表値。既存データにこれ以外の値が
// 入っている場合は、呼び出し側で現在値を選択肢に追加すること。
export const COUNT_QUANTITY_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

export function isCountUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  return (COUNT_UNITS as readonly string[]).includes(unit.trim());
}

// 個数単位の分量<select>に出す選択肢。既存データがCOUNT_QUANTITY_OPTIONSに
// 無い値(AI提案由来の0.33など)の場合も表示・選択できるよう、現在値を
// 選択肢に加える。
export function countQuantityOptionsFor(current: number | null): number[] {
  if (current == null || (COUNT_QUANTITY_OPTIONS as readonly number[]).includes(current)) {
    return [...COUNT_QUANTITY_OPTIONS];
  }
  return [...COUNT_QUANTITY_OPTIONS, current].sort((a, b) => a - b);
}

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
