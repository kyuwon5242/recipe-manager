"use client";

import Link from "next/link";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { setDragPayload } from "@/lib/meal-plan-tray/drag";
import type { ExistingRecipeSuggestion } from "@/types/recipe-suggestion";

export function ExistingRecipeSuggestionCard({
  suggestion,
  genre = null,
}: {
  suggestion: ExistingRecipeSuggestion;
  genre?: string | null;
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
          genre,
        })
      }
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-4 shadow-raised active:cursor-grabbing"
    >
      <Link
        href={`/recipes/${suggestion.recipe_id}`}
        className="font-semibold text-brand-700 hover:underline"
      >
        {suggestion.title}
      </Link>
      <p className="mt-1 text-sm text-gray-500">{suggestion.reason}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">🧺 献立トレイへドラッグ、またはボタンで追加</p>
        <AddToTrayButton
          genre={genre}
          assignment={{
            kind: "existing",
            recipeId: suggestion.recipe_id,
            title: suggestion.title,
            category: null,
            genre,
          }}
        />
      </div>
    </div>
  );
}
