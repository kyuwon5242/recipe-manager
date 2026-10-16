"use client";

import { useState, useTransition } from "react";
import { makeDish } from "@/app/game/cook/actions";

export function MakeDishButton({ recipeId, title }: { recipeId: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            !confirm(
              `「${title}」を作りますか?使った食材カードはそれぞれ1枚消費されます(図鑑の入手済み表示は消えません)。`
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await makeDish(recipeId);
            if (result.error) setError(result.error);
          });
        }}
        className="animate-[bounce_2s_infinite] rounded-full bg-gradient-to-r from-amber-400 to-brand-600 px-4 py-2 text-sm font-bold text-white shadow-brand transition hover:scale-105 hover:from-amber-300 hover:to-brand-500 active:scale-95 disabled:animate-none disabled:opacity-50"
      >
        {isPending ? "👩‍🍳 作っています…" : "🍳 Let's Cooking!"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
