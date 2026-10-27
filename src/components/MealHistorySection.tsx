"use client";

import { useState } from "react";
import { RecipeLink } from "@/components/RecipeLink";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { toTrayGenre } from "@/types/meal-plan-tray";

type MealHistoryRecipe = {
  id: string;
  title: string;
  servings: number | null;
  genre: string | null;
  category: string | null;
};

type MealHistorySet = {
  id: string;
  createdAt: string;
  memo: string | null;
  recipes: MealHistoryRecipe[];
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  });
}

// 「今回つくるレシピはこれ」の直下に表示する、直近3件の献立セットの履歴。
// 縦に並べると冗長になるため、普段は閉じておき、見出しを押すと展開する。
export function MealHistorySection({ sets }: { sets: MealHistorySet[] }) {
  const [expanded, setExpanded] = useState(false);
  const { addToTray, isRecipeInTray } = useMealPlanTray();

  if (sets.length === 0) return null;

  function handleDuplicate(set: MealHistorySet) {
    for (const recipe of set.recipes) {
      // すでにトレイに入っているレシピは重複して追加しない。
      if (isRecipeInTray(recipe.id)) continue;
      addToTray(toTrayGenre(recipe.genre), {
        kind: "existing",
        recipeId: recipe.id,
        title: recipe.title,
        category: recipe.category,
        genre: recipe.genre,
      });
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-raised"
      >
        <span>📜 過去の献立(直近{sets.length}件)</span>
        <span className="text-gray-400">{expanded ? "閉じる ▾" : "開く ▸"}</span>
      </button>

      {expanded ? (
        <div className="mt-2 space-y-3">
          {sets.map((set, index) => (
            <div key={set.id} className="rounded-xl bg-white p-4 shadow-raised">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">
                  {index === 0 ? "今回" : formatShortDate(set.createdAt)}
                </p>
                {set.recipes.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleDuplicate(set)}
                    className="rounded-full border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 active:scale-95"
                  >
                    🧺 まとめて複製
                  </button>
                ) : null}
              </div>

              {set.recipes.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">レシピの記録がありません。</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {set.recipes.map((recipe) => (
                    <li key={recipe.id} className="flex items-center justify-between gap-2 text-sm">
                      <RecipeLink
                        recipeId={recipe.id}
                        servings={recipe.servings}
                        className="text-brand-700 hover:underline"
                      >
                        {recipe.title}
                        {recipe.servings ? (
                          <span className="ml-1 text-xs text-gray-400">({recipe.servings}人前)</span>
                        ) : null}
                      </RecipeLink>
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
                    </li>
                  ))}
                </ul>
              )}

              {set.memo ? (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  📝 {set.memo}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
