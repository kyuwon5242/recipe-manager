// レシピ詳細の人数プルダウンで、レシピ本来の人数(recipe.servings)からの
// 比率に応じて材料の分量を再計算するための共通ロジック。
// 食材リスト作成時の集計(aggregate.ts)と同じ考え方(基準人数が無ければ
// 倍率1のまま)だが、ここでは合算せず単一レシピの表示のみを対象にする。

export function servingsMultiplier(baseServings: number | null, targetServings: number): number {
  return baseServings && baseServings > 0 ? targetServings / baseServings : 1;
}

export function scaleQuantity(quantity: number | null, multiplier: number): number | null {
  if (quantity == null) return null;
  return Math.round(quantity * multiplier * 100) / 100;
}
