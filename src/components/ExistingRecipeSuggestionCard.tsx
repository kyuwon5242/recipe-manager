"use client";

import Link from "next/link";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { setDragPayload } from "@/lib/meal-plan-tray/drag";
import { useIsTouchDevice } from "@/lib/hooks/useIsTouchDevice";
import type { ExistingRecipeSuggestion } from "@/types/recipe-suggestion";

export function ExistingRecipeSuggestionCard({
  suggestion,
  genre = null,
}: {
  suggestion: ExistingRecipeSuggestion;
  genre?: string | null;
}) {
  const isTouch = useIsTouchDevice();

  return (
    <div
      draggable={!isTouch}
      onDragStart={(e) =>
        setDragPayload(e, {
          kind: "existing",
          recipeId: suggestion.recipe_id,
          title: suggestion.title,
          category: null,
          genre,
        })
      }
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-raised ${isTouch ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      <Link
        href={`/recipes/${suggestion.recipe_id}`}
        className="font-semibold text-brand-700 hover:underline"
      >
        {suggestion.title}
      </Link>
      <p className="mt-1 text-sm text-gray-500">{suggestion.reason}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">🧺 ボタンで献立トレイに追加</p>
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
