"use client";

import { useActionState } from "react";
import { cleanupIngredients, type CleanupState } from "@/app/ingredients/actions";

const initialState: CleanupState = { result: null, error: null };

export function IngredientCleanupForm() {
  const [state, formAction, isPending] = useActionState(cleanupIngredients, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "整理中...(数十秒かかる場合があります)" : "食材の表記ゆれを整理する"}
        </button>
      </form>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>
            {state.result.totalBefore}件 → {state.result.totalAfter}件に整理しました。
          </p>
          <p className="mt-1 text-xs">
            統合: {state.result.mergedCount}件 / カテゴリ設定: {state.result.categorizedCount}件
          </p>
        </div>
      ) : null}
    </div>
  );
}
