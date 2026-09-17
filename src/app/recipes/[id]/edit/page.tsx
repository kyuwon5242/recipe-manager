import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/RecipeForm";
import { updateRecipe } from "../../actions";
import type { Recipe } from "@/types/recipe";

type RecipeIngredientRow = {
  quantity: number | null;
  unit: string | null;
  ingredients_master: { name: string } | null;
};

export const metadata = { title: "レシピ編集" };

export default async function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
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
    notFound();
  }

  const { data: ingredientRows, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("quantity, unit, ingredients_master(name)")
    .eq("recipe_id", id)
    .returns<RecipeIngredientRow[]>();

  if (ingredientsError) {
    throw new Error(`材料の取得に失敗しました: ${ingredientsError.message}`);
  }

  const initialIngredients = (ingredientRows ?? []).map((row) => ({
    name: row.ingredients_master?.name ?? "",
    quantity: row.quantity != null ? String(row.quantity) : "",
    unit: row.unit ?? "",
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">レシピを編集</h1>
      <RecipeForm
        action={updateRecipe.bind(null, recipe.id)}
        submitLabel="更新する"
        initialRecipe={recipe}
        initialIngredients={initialIngredients}
      />
    </div>
  );
}
