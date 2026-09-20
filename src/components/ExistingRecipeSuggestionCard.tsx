"use client";

import Link from "next/link";
import { setDragPayload } from "@/lib/meal-plan-tray/drag";
import type { ExistingRecipeSuggestion } from "@/types/recipe-suggestion";

export function ExistingRecipeSuggestionCard({
  suggestion,
}: {
  suggestion: ExistingRecipeSuggestion;
}) {
  return (
    <div
      draggable
      onDragStart={(e) =>
        setDragPayload(e, {
          kind: "existing",
          recipeId: suggestion.recipe_id,
          title: suggestion.title,
          category: null,
          genre: null,
        })
      }
      className="cursor-grab rounded-lg border border-gray-200 p-4 active:cursor-grabbing"
    >
      <Link
        href={`/recipes/${suggestion.recipe_id}`}
        className="font-semibold text-emerald-700 hover:underline"
      >
        {suggestion.title}
      </Link>
      <p className="mt-1 text-sm text-gray-500">{suggestion.reason}</p>
      <p className="mt-1 text-xs text-gray-400">献立トレイへドラッグできます</p>
    </div>
  );
}
