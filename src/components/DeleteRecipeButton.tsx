"use client";

import { useTransition } from "react";

export function DeleteRecipeButton({
  recipeId,
  deleteAction,
}: {
  recipeId: string;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("このレシピを削除しますか?")) return;
        startTransition(() => {
          deleteAction(recipeId);
        });
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "削除中..." : "削除"}
    </button>
  );
}
