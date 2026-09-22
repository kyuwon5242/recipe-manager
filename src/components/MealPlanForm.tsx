"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { ExistingRecipeSuggestionCard } from "@/components/ExistingRecipeSuggestionCard";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { suggestMealPlan, type MealPlanState } from "@/app/menu-plan/actions";

const initialState: MealPlanState = { result: null, error: null };
const SLOT_GENRES = ["主食", "主菜", "副菜", "汁物"] as const;

export function MealPlanForm() {
  const [state, formAction, isPending] = useActionState(suggestMealPlan, initialState);

  const existingIds = useMemo(
    () =>
      (state.result?.slots ?? [])
        .filter((s) => s.kind === "existing")
        .map((s) => s.recipeId),
    [state.result]
  );

  return (
    <div className="mt-6 space-y-6">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            含めたい品目(品数)
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SLOT_GENRES.map((genre) => (
              <label key={genre} className="flex items-center gap-2 text-sm">
                {genre}
                <select
                  name={`count_${genre}`}
                  defaultValue={1}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            人数はレシピが決まった後、食材リスト作成の画面で調整できます。
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">条件(任意)</label>
          <textarea
            name="request"
            rows={3}
            placeholder="例: 和食中心で野菜多め / 旬の食材を使いたい / さっぱりしたものが食べたい"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
        >
          {isPending ? "考え中..." : "献立を提案してもらう"}
        </button>
      </form>

      {isPending ? <AIThinkingIndicator label="AIが献立を考え中..." /> : null}

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{state.result.planTitle}</h2>
          <ul className="space-y-3">
            {state.result.slots.map((slot, i) => (
              <li key={i}>
                <p className="mb-1 text-xs font-semibold text-gray-400">{slot.slot}</p>
                {slot.kind === "existing" ? (
                  <ExistingRecipeSuggestionCard
                    suggestion={{
                      recipe_id: slot.recipeId,
                      title: slot.title,
                      reason: slot.reason,
                    }}
                    genre={slot.slot.replace(/\d+$/, "")}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm">
                    <p className="font-medium text-gray-600">該当する登録済みレシピが見つかりませんでした</p>
                    <p className="mt-1 text-gray-500">{slot.reason}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      「新レシピ提案」でAIに考えてもらうか、先にレシピを登録してから再度お試しください。
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {existingIds.length > 0 ? (
            <Link
              href={`/shopping-list?recipes=${existingIds.join(",")}`}
              className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
            >
              この献立で食材リストを作成
            </Link>
          ) : (
            <p className="text-sm text-gray-500">
              該当する登録済みレシピが見つかりませんでした。レシピを登録してから再度お試しください。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
