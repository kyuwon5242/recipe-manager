"use client";

import { useTransition } from "react";
import { deleteShoppingList } from "@/app/shopping-lists/actions";

export function DeleteShoppingListButton({ listId }: { listId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("この買い物リストを削除しますか?")) return;
        startTransition(() => {
          deleteShoppingList(listId);
        });
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "削除中..." : "削除"}
    </button>
  );
}
