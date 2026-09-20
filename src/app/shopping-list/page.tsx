import { createClient } from "@/lib/supabase/server";
import { IngredientListBuilder } from "@/components/IngredientListBuilder";
import { ZoneIcon } from "@/components/ZoneIcon";
import type { BuilderRecipe, InitialSelection } from "@/types/shopping-list";

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
  servings: number | null;
  is_favorite: boolean;
  recipe_ingredients: IngredientRow[];
};

function parseInitialSelections(params: Record<string, string | string[] | undefined>): InitialSelection[] {
  const planParam = params.plan;
  const planValue = Array.isArray(planParam) ? planParam.join(",") : planParam ?? "";
  if (planValue) {
    return planValue
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [id, servings] = entry.split(":");
        return { id, servings: servings ? Number(servings) : null };
      })
      .filter((entry) => entry.id.length > 0);
  }

  const recipesParam = params.recipes;
  const recipesValue = Array.isArray(recipesParam) ? recipesParam.join(",") : recipesParam ?? "";
  return recipesValue
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => ({ id, servings: null }));
}

export default async function ShoppingListPage({
  searchParams,
}: PageProps<"/shopping-list">) {
  const params = await searchParams;
  const initialSelections = parseInitialSelections(params);

  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(
      "id, title, category, genre, servings, is_favorite, recipe_ingredients(quantity, unit, ingredients_master(name, category))"
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
    servings: recipe.servings,
    is_favorite: recipe.is_favorite,
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
      <div className="flex items-center gap-3">
        <ZoneIcon zone="shopping" icon="📝" />
        <h1 className="text-2xl font-bold">食材リストを作成</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        作る予定のレシピを選ぶと、必要な食材がリアルタイムで表示されます。手持ちの食材はチェックし、分量が分かれば入力してください(未入力の場合は足りているものとして扱います)。
      </p>
      <IngredientListBuilder recipes={builderRecipes} initialSelections={initialSelections} />
    </div>
  );
}
