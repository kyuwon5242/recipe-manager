import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/types/recipe";

type RecipeIngredientRow = {
  id: string;
  quantity: number | null;
  unit: string | null;
  ingredients_master: { name: string } | null;
};

export type RecipeDetail = {
  recipe: Recipe;
  ingredients: RecipeIngredientRow[];
};

// レシピ詳細ページとレシピ詳細ポップアップの両方から使う、
// レシピ本体+材料の取得ロジック。
export async function getRecipeDetail(id: string): Promise<RecipeDetail | null> {
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Recipe>();

  if (error) {
    throw new Error(`レシピの取得に失敗しました: ${error.message}`);
  }
  if (!recipe) {
    return null;
  }

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("id, quantity, unit, ingredients_master(name)")
    .eq("recipe_id", id)
    .returns<RecipeIngredientRow[]>();

  if (ingredientsError) {
    throw new Error(`材料の取得に失敗しました: ${ingredientsError.message}`);
  }

  return { recipe, ingredients: ingredients ?? [] };
}
