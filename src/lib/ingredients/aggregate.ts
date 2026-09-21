import { formatBaseQuantity, normalizeUnit, type UnitGroup } from "@/lib/ingredients/units";
import { UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";

// 同じ食材でもレシピによって単位がバラバラなことがある(人参の「240g」と
// 「1本」、みりんの「大さじ」と「小さじ」など)。g/kg・ml/大さじ/小さじ等の
// 換算可能な単位は合算した1つの数量にまとめ、「1本」のような個数単位は
// 換算できないため、同じ食材名の下に別セグメントとして並べて表示する。
//
// 食材リストを作成画面(IngredientListBuilder)と献立エージェントの
// compute_shopping_listツールの両方から使う共通ロジック。
export type QuantitySegment = {
  segmentKey: string;
  quantity: number | null;
  unit: string | null;
};

export type NeededIngredient = {
  key: string;
  name: string;
  category: string;
  segments: QuantitySegment[];
};

export type AggregateIngredientInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
};

export type AggregateRecipeInput = {
  servings: number | null;
  targetServings?: number | null;
  ingredients: AggregateIngredientInput[];
};

export function aggregateNeededIngredients(recipes: AggregateRecipeInput[]): NeededIngredient[] {
  type Accumulator = { quantity: number | null; unit: string | null; group?: UnitGroup };
  const order: string[] = [];
  const byName = new Map<string, { category: string; segments: Map<string, Accumulator> }>();

  for (const recipe of recipes) {
    const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
    const target = recipe.targetServings ?? baseServings ?? 1;
    const multiplier = baseServings ? target / baseServings : 1;

    for (const ingredient of recipe.ingredients) {
      const name = ingredient.name;
      if (!byName.has(name)) {
        byName.set(name, { category: ingredient.category ?? UNCATEGORIZED_LABEL, segments: new Map() });
        order.push(name);
      }
      const entry = byName.get(name)!;
      const scaledQuantity = ingredient.quantity != null ? ingredient.quantity * multiplier : null;
      const normalized = normalizeUnit(ingredient.unit);
      const segKey = normalized ? normalized.group : ingredient.unit ?? "";
      const addedValue =
        normalized && scaledQuantity != null ? scaledQuantity * normalized.factor : scaledQuantity;

      const existing = entry.segments.get(segKey);
      if (existing) {
        existing.quantity =
          existing.quantity != null && addedValue != null ? existing.quantity + addedValue : null;
      } else {
        entry.segments.set(segKey, {
          quantity: addedValue,
          unit: normalized ? null : ingredient.unit,
          group: normalized?.group,
        });
      }
    }
  }

  return order.map((name) => {
    const entry = byName.get(name)!;
    const segments: QuantitySegment[] = Array.from(entry.segments.entries()).map(([segKey, seg]) => {
      if (seg.group) {
        const formatted = seg.quantity != null ? formatBaseQuantity(seg.group, seg.quantity) : null;
        return {
          segmentKey: `${name}__${segKey}`,
          quantity: formatted?.quantity ?? null,
          unit: formatted?.unit ?? (seg.group === "weight" ? "g" : "ml"),
        };
      }
      return { segmentKey: `${name}__${segKey}`, quantity: seg.quantity, unit: seg.unit };
    });
    return { key: name, name, category: entry.category, segments };
  });
}

// segmentsをフラットな買い物リスト行(name/quantity/unit/category)に変換する。
export function flattenToShoppingItems(
  needed: NeededIngredient[]
): { name: string; quantity: number | null; unit: string | null; category: string }[] {
  return needed.flatMap((ingredient) =>
    ingredient.segments.map((seg) => ({
      name: ingredient.name,
      quantity: seg.quantity,
      unit: seg.unit,
      category: ingredient.category,
    }))
  );
}
