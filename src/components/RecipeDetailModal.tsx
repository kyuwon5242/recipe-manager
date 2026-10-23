"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRecipeDetailModal } from "@/lib/recipe-detail-modal/context";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { deleteRecipe, toggleFavorite } from "@/app/recipes/actions";
import type { RecipeDetail } from "@/lib/recipes/get-recipe-detail";

// レシピカード/リンクからページ遷移せずに詳細を確認できるポップアップ。
// 内容は/recipes/[id]の詳細ページと同じ項目を表示する。
export function RecipeDetailModal() {
  const { openRecipeId, entry, closeRecipe, patchCachedRecipe } = useRecipeDetailModal();
  const [isFavoritePending, startFavoriteTransition] = useTransition();

  if (!openRecipeId) return null;

  function handleToggleFavorite(recipeId: string, nextValue: boolean) {
    patchCachedRecipe(recipeId, { is_favorite: nextValue });
    startFavoriteTransition(() => {
      toggleFavorite(recipeId, nextValue);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={closeRecipe}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white p-5 shadow-raised sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={closeRecipe}
            aria-label="閉じる"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {!entry?.detail ? (
          <p className="py-10 text-center text-sm text-gray-400">読み込み中...</p>
        ) : (
          <RecipeDetailContent
            detail={entry.detail}
            isFavoritePending={isFavoritePending}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </div>
    </div>
  );
}

function RecipeDetailContent({
  detail,
  isFavoritePending,
  onToggleFavorite,
}: {
  detail: RecipeDetail;
  isFavoritePending: boolean;
  onToggleFavorite: (recipeId: string, nextValue: boolean) => void;
}) {
  const { recipe, ingredients } = detail;

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="min-w-0 text-2xl font-bold">{recipe.title}</h2>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            type="button"
            disabled={isFavoritePending}
            onClick={() => onToggleFavorite(recipe.id, !recipe.is_favorite)}
            aria-label={recipe.is_favorite ? "いいねを取り消す" : "いいねする"}
            className={`rounded-full p-1.5 text-lg leading-none transition disabled:opacity-50 ${
              recipe.is_favorite ? "text-red-500" : "text-gray-300 hover:text-red-400"
            }`}
          >
            {recipe.is_favorite ? "♥" : "♡"}
          </button>
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

      <p className="mt-1 text-sm text-gray-500">
        {[recipe.category, recipe.genre].filter(Boolean).join(" / ") || "カテゴリ未設定"}
        {recipe.servings ? ` ・ ${recipe.servings}人前` : ""}
      </p>

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
        <h3 className="text-lg font-semibold">材料</h3>
        {ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">材料が登録されていません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {ingredients.map((ingredient) => (
              <li key={ingredient.id} className="flex justify-between px-3 py-2 text-sm">
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
        <h3 className="text-lg font-semibold">作り方</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {recipe.instructions || "作り方が登録されていません。"}
        </p>
      </section>

      {recipe.memo ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">メモ</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{recipe.memo}</p>
        </section>
      ) : null}
    </div>
  );
}
