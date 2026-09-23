"use client";

import { useState, useTransition } from "react";
import { deleteGameCard } from "@/app/admin/game-cards/actions";

export function GameCardDeleteButton({ cardId }: { cardId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await deleteGameCard(cardId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "削除中..." : "削除"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
