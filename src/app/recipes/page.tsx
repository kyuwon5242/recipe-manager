import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { Recipe } from "@/types/recipe";

export const metadata = { title: "レシピ一覧" };

type RecipeListItem = Pick<
  Recipe,
  "id" | "title" | "category" | "genre" | "servings" | "photo_url" | "created_at"
> & { is_favorite: boolean };

export default async function RecipesPage({
  searchParams,
}: PageProps<"/recipes">) {
  const params = await searchParams;
  const favoriteOnly = params.favorite === "1";

  const supabase = await createClient();
  let query = supabase
    .from("recipes")
    .select("id, title, category, genre, servings, photo_url, is_favorite, created_at")
    .order("created_at", { ascending: false });

  if (favoriteOnly) {
    query = query.eq("is_favorite", true);
  }

  const { data: recipes, error } = await query.returns<RecipeListItem[]>();

  if (error) {
    throw new Error(`レシピの取得に失敗しました: ${error.message}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">レシピ一覧</h1>
        <Link
          href="/recipes/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + レシピを登録
        </Link>
      </div>

      <div className="mb-4">
        <Link
          href={favoriteOnly ? "/recipes" : "/recipes?favorite=1"}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${
            favoriteOnly
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {favoriteOnly ? "♥ お気に入りのみ表示中" : "♡ お気に入りのみ表示"}
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="text-gray-500">
          {favoriteOnly
            ? "お気に入りのレシピがまだありません。"
            : "まだレシピが登録されていません。"}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="relative">
              <Link
                href={`/recipes/${recipe.id}`}
                className="block rounded-lg border border-gray-200 p-4 transition hover:border-emerald-500 hover:shadow-sm"
              >
                {recipe.photo_url ? (
                  <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={recipe.photo_url}
                      alt={recipe.title}
                      fill
                      sizes="(min-width: 640px) 20rem, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <p className="pr-8 font-semibold">{recipe.title}</p>
                <p className="text-sm text-gray-500">
                  {[recipe.category, recipe.genre].filter(Boolean).join(" / ") ||
                    "カテゴリ未設定"}
                  {recipe.servings ? ` ・ ${recipe.servings}人前` : ""}
                </p>
              </Link>
              <div className="absolute right-3 top-3">
                <FavoriteButton recipeId={recipe.id} isFavorite={recipe.is_favorite} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
