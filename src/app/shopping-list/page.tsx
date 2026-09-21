import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { getFamilyStores } from "@/lib/shopping/defaults";
import { IngredientListBuilder } from "@/components/IngredientListBuilder";
import { ZoneIcon } from "@/components/ZoneIcon";
import { HelpPanel } from "@/components/HelpPanel";
import type { BuilderRecipe, InitialSelection } from "@/types/shopping-list";
import type { FamilyDefaultItem } from "@/types/shopping-settings";

export const metadata = { title: "食材リストを作成" };

const HELP_ITEMS = [
  {
    label: "3ステップの流れ",
    desc: "①作る予定のレシピを選ぶ→②手持ちの食材を確認する→③買い物リストを作成、の順に進みます。",
  },
  {
    label: "スーパーの選択",
    desc: "家族設定で登録したスーパーを選ぶと、そのスーパーの売り場順で買い物リストが並びます。",
  },
];

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
  const familyId = await getCurrentFamilyId();
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

  const stores = await getFamilyStores(supabase, familyId);

  const { data: defaultItems, error: defaultItemsError } = await supabase
    .from("family_default_items")
    .select("id, name, quantity, unit, category, position")
    .eq("family_id", familyId)
    .order("position", { ascending: true })
    .returns<FamilyDefaultItem[]>();

  if (defaultItemsError) {
    throw new Error(`デフォルト食材の取得に失敗しました: ${defaultItemsError.message}`);
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
      <div className="flex items-center gap-2">
        <ZoneIcon zone="shopping" icon="📝" />
        <h1 className="text-2xl font-bold">食材リストを作成</h1>
        <HelpPanel title="食材リストを作成" items={HELP_ITEMS} />
      </div>
      <IngredientListBuilder
        recipes={builderRecipes}
        initialSelections={initialSelections}
        stores={stores}
        defaultItems={defaultItems ?? []}
      />
    </div>
  );
}
