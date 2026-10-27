import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { RecipeServingsPanel } from "@/components/RecipeServingsPanel";
import { deleteRecipe } from "../actions";
import { getRecipeDetail } from "@/lib/recipes/get-recipe-detail";

export default async function RecipeDetailPage({
  params,
}: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const detail = await getRecipeDetail(id);

  if (!detail) {
    notFound();
  }
  const { recipe, ingredients } = detail;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/recipes" className="text-sm text-brand-700 hover:underline">
        ← レシピ一覧に戻る
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h1 className="min-w-0 text-3xl font-bold">{recipe.title}</h1>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <FavoriteButton recipeId={recipe.id} isFavorite={recipe.is_favorite} />
          <AddToTrayButton
            genre={recipe.genre}
            assignment={{
              kind: "existing",
              recipeId: recipe.id,
              title: recipe.title,
              category: recipe.category,
              genre: recipe.genre,
            }}
          />
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            編集
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} deleteAction={deleteRecipe} />
        </div>
      </div>

      <RecipeServingsPanel recipe={recipe} ingredients={ingredients} headingTag="h2" />

      {recipe.recipe_url ? (
        <p className="mt-4 text-sm">
          参照元:{" "}
          <a
            href={recipe.recipe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            {recipe.recipe_url}
          </a>
        </p>
      ) : null}

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
