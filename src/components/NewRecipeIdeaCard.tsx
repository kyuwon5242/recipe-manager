"use client";

import { useState } from "react";
import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe } from "@/app/recipes/actions";
import type { NewRecipeIdea } from "@/types/recipe-suggestion";

export function NewRecipeIdeaCard({ idea }: { idea: NewRecipeIdea }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <p className="font-semibold">{idea.title}</p>
      <p className="mt-1 text-sm text-gray-500">{idea.reason}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-sm text-emerald-700 hover:underline"
      >
        {expanded ? "閉じる" : "詳細を見て登録する"}
      </button>
      {expanded ? (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <RecipeForm
            action={createRecipe}
            submitLabel="このレシピを登録する"
            initialRecipe={idea.recipe}
            initialIngredients={idea.ingredients}
          />
        </div>
      ) : null}
    </li>
  );
}
