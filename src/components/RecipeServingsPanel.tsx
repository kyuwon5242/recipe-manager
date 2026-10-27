"use client";

import { useState } from "react";
import { scaleQuantity, servingsMultiplier } from "@/lib/recipes/scale-quantity";
import type { Recipe } from "@/types/recipe";
import type { RecipeDetail } from "@/lib/recipes/get-recipe-detail";

const MAX_SERVINGS_OPTION = 12;

function servingsOptionsFor(current: number): number[] {
  const options = Array.from({ length: MAX_SERVINGS_OPTION }, (_, i) => i + 1);
  if (!options.includes(current)) options.push(current);
  return options.sort((a, b) => a - b);
}

// レシピ詳細(専用ページ/ポップアップ共通)の「カテゴリ・人数」行と材料一覧。
// 人数をプルダウンで変えると、レシピ本来の人数(recipe.servings)からの比率で
// 材料の分量をリアルタイムに再計算する(レシピ自体の人数設定は変更しない)。
// 基準人数が未設定のレシピは比率を計算できないため、プルダウンは出さない。
export function RecipeServingsPanel({
  recipe,
  ingredients,
  initialServings,
  headingTag = "h3",
}: {
  recipe: Recipe;
  ingredients: RecipeDetail["ingredients"];
  initialServings?: number | null;
  headingTag?: "h2" | "h3";
}) {
  const hasBaseServings = !!(recipe.servings && recipe.servings > 0);
  const [servings, setServings] = useState(() => {
    if (initialServings && initialServings > 0) return initialServings;
    return recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  });
  const multiplier = servingsMultiplier(recipe.servings, servings);
  const HeadingTag = headingTag;

  return (
    <>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <span>{[recipe.category, recipe.genre].filter(Boolean).join(" / ") || "カテゴリ未設定"}</span>
        {hasBaseServings ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">・</span>
            <select
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              aria-label="表示する人数"
              className="rounded-md border border-gray-300 px-1 py-0.5 text-sm text-gray-700"
            >
              {servingsOptionsFor(servings).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>人前</span>
          </span>
        ) : null}
      </p>

      <section className="mt-6">
        <HeadingTag className="text-lg font-semibold">材料</HeadingTag>
        {ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">材料が登録されていません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {ingredients.map((ingredient) => {
              const quantity = scaleQuantity(ingredient.quantity, multiplier);
              return (
                <li key={ingredient.id} className="flex justify-between px-3 py-2 text-sm">
                  <span>{ingredient.ingredients_master?.name ?? "(不明な食材)"}</span>
                  <span className="text-gray-500">
                    {[quantity, ingredient.unit].filter(Boolean).join("")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
