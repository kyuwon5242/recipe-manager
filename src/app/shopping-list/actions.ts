"use server";

import { createClient } from "@/lib/supabase/server";
import { runShoppingListAgent, type ShoppingListResult } from "@/lib/shopping-list/agent";
import type { NeededIngredient } from "@/lib/shopping-list/types";

export type GenerateShoppingListState = {
  result: ShoppingListResult | null;
  error: string | null;
};

type RecipeIngredientRow = {
  quantity: number | null;
  unit: string | null;
  ingredients_master: { name: string } | null;
};

function aggregateIngredients(rows: RecipeIngredientRow[]): NeededIngredient[] {
  const map = new Map<string, NeededIngredient>();

  for (const row of rows) {
    const name = row.ingredients_master?.name;
    if (!name) continue;
    const unit = row.unit ?? null;
    const key = `${name}__${unit ?? ""}`;
    const existing = map.get(key);

    if (existing) {
      if (existing.quantity != null && row.quantity != null) {
        existing.quantity += row.quantity;
      } else {
        existing.quantity = null;
      }
    } else {
      map.set(key, { name, quantity: row.quantity, unit });
    }
  }

  return Array.from(map.values());
}

export async function generateShoppingList(
  _prevState: GenerateShoppingListState,
  formData: FormData
): Promise<GenerateShoppingListState> {
  const recipeIds = formData.getAll("recipe_id").map(String);
  const stockText = String(formData.get("stock_text") ?? "");

  if (recipeIds.length === 0) {
    return { result: null, error: "レシピを1つ以上選択してください" };
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("recipe_ingredients")
    .select("quantity, unit, ingredients_master(name)")
    .in("recipe_id", recipeIds)
    .returns<RecipeIngredientRow[]>();

  if (error) {
    return { result: null, error: `食材の取得に失敗しました: ${error.message}` };
  }

  const needed = aggregateIngredients(rows ?? []);

  if (needed.length === 0) {
    return { result: null, error: "選択したレシピに材料が登録されていません" };
  }

  try {
    const result = await runShoppingListAgent(needed, stockText);
    return { result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    return { result: null, error: `買い物リストの生成に失敗しました: ${message}` };
  }
}
