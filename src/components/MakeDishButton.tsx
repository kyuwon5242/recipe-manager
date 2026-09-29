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
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50"
      >
        {isPending ? "作っています…" : "料理を作る"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
