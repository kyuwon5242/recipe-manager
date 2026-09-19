"use client";

import { useTransition } from "react";
import { toggleFavorite } from "@/app/recipes/actions";

export function FavoriteButton({
  recipeId,
  isFavorite,
}: {
  recipeId: string;
  isFavorite: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => {
          toggleFavorite(recipeId, !isFavorite);
        });
      }}
      aria-label={isFavorite ? "いいねを取り消す" : "いいねする"}
      className={`rounded-full p-1.5 text-lg leading-none transition disabled:opacity-50 ${
        isFavorite ? "text-red-500" : "text-gray-300 hover:text-red-400"
      }`}
    >
      {isFavorite ? "♥" : "♡"}
    </button>
  );
}
