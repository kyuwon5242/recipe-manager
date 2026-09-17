import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { deleteRecipe } from "../actions";
import type { Recipe } from "@/types/recipe";

type RecipeIngredientRow = {
  id: string;
  quantity: number | null;
  unit: string | null;
  ingredients_master: { name: string } | null;
};

export default async function RecipeDetailPage({
  params,
}: PageProps<"/recipes/[id]">) {
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

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("id, quantity, unit, ingredients_master(name)")
    .eq("recipe_id", id)
    .returns<RecipeIngredientRow[]>();

  if (ingredientsError) {
    throw new Error(`材料の取得に失敗しました: ${ingredientsError.message}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/recipes" className="text-sm text-emerald-700 hover:underline">
        ← レシピ一覧に戻る
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold">{recipe.title}</h1>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            編集
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} deleteAction={deleteRecipe} />
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {[recipe.category, recipe.genre].filter(Boolean).join(" / ") ||
          "カテゴリ未設定"}
        {recipe.servings ? ` ・ ${recipe.servings}人前` : ""}
      </p>

      {recipe.photo_url ? (
        <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={recipe.photo_url}
            alt={recipe.title}
            fill
            sizes="48rem"
            className="object-cover"
          />
        </div>
      ) : null}

      {recipe.recipe_url ? (
        <p className="mt-4 text-sm">
          参照元:{" "}
          <a
            href={recipe.recipe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline"
          >
            {recipe.recipe_url}
          </a>
        </p>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">材料</h2>
        {ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">材料が登録されていません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
            {ingredients.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex justify-between px-3 py-2 text-sm"
              >
                <span>{ingredient.ingredients_master?.name ?? "(不明な食材)"}</span>
                <span className="text-gray-500">
                  {[ingredient.quantity, ingredient.unit].filter(Boolean).join("")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">作り方</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {recipe.instructions || "作り方が登録されていません。"}
        </p>
      </section>

      {recipe.memo ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">メモ</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {recipe.memo}
          </p>
        </section>
      ) : null}
    </div>
  );
}
