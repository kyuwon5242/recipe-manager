"use client";

import { useState } from "react";
import { RecipeForm } from "@/components/RecipeForm";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { createRecipe } from "@/app/recipes/actions";
import { setDragPayload } from "@/lib/meal-plan-tray/drag";
import { useIsTouchDevice } from "@/lib/hooks/useIsTouchDevice";
import type { NewRecipeIdea } from "@/types/recipe-suggestion";

export function NewRecipeIdeaCard({ idea }: { idea: NewRecipeIdea }) {
  const [expanded, setExpanded] = useState(false);
  const isTouch = useIsTouchDevice();

  return (
    <li
      draggable={!isTouch}
      onDragStart={(e) => setDragPayload(e, { kind: "idea", idea })}
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-raised ${isTouch ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      <p className="font-semibold">{idea.title}</p>
      <p className="mt-1 text-sm text-gray-500">{idea.reason}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">🧺 ボタンで献立トレイに追加(未登録)</p>
        <AddToTrayButton genre={idea.recipe.genre} assignment={{ kind: "idea", idea }} />
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-sm text-brand-700 hover:underline"
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
