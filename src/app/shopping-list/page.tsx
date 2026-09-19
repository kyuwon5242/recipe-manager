import { createClient } from "@/lib/supabase/server";
import { IngredientListBuilder } from "@/components/IngredientListBuilder";
import type { BuilderRecipe } from "@/types/shopping-list";

export const metadata = { title: "食材リストを作成" };

type IngredientRow = {
  quantity: number | null;
  unit: string | null;
  ingredients_master: { name: string; category: string | null } | null;
};

type RecipeRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  recipe_ingredients: IngredientRow[];
};

export default async function ShoppingListPage() {
  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(
      "id, title, category, genre, recipe_ingredients(quantity, unit, ingredients_master(name, category))"
    )
    .order("created_at", { ascending: false })
    .returns<RecipeRow[]>();

  if (error) {
    throw new Error(`レシピの取得に失敗しました: ${error.message}`);
  }

  const builderRecipes: BuilderRecipe[] = (recipes ?? []).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    genre: recipe.genre,
    ingredients: recipe.recipe_ingredients
      .filter((ri) => ri.ingredients_master)
      .map((ri) => ({
        name: ri.ingredients_master!.name,
        quantity: ri.quantity,
        unit: ri.unit,
        category: ri.ingredients_master!.category,
      })),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">食材リストを作成</h1>
      <p className="mt-2 text-sm text-gray-500">
        作る予定のレシピを選ぶと、必要な食材がリアルタイムで表示されます。手持ちの分量を入力すると、不足分だけの食材リストを作成できます。
      </p>
      <IngredientListBuilder recipes={builderRecipes} />
    </div>
  );
}
