"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { ExistingRecipeSuggestionCard } from "@/components/ExistingRecipeSuggestionCard";
import { NewRecipeIdeaCard } from "@/components/NewRecipeIdeaCard";
import { suggestMealPlan, type MealPlanState } from "@/app/menu-plan/actions";
import { GENRE_TABS } from "@/lib/recipe-genre";

const initialState: MealPlanState = { result: null, error: null };
const SLOT_OPTIONS = GENRE_TABS.filter((g) => g !== "その他");

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
          <label className="block text-sm font-medium text-gray-700">人数</label>
          <input
            type="number"
            name="servings"
            min={1}
            defaultValue={2}
            className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">含めたい品目</label>
          <div className="mt-1 flex flex-wrap gap-3">
            {SLOT_OPTIONS.map((slot) => (
              <label key={slot} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="slots" value={slot} defaultChecked />
                {slot}
              </label>
            ))}
          </div>
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
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "考え中..." : "献立を提案してもらう"}
        </button>
      </form>

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
                  />
                ) : (
                  <ul>
                    <NewRecipeIdeaCard idea={slot.idea} />
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {existingIds.length > 0 ? (
            <Link
              href={`/shopping-list?recipes=${existingIds.join(",")}`}
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              この献立で食材リストを作成
            </Link>
          ) : (
            <p className="text-sm text-gray-500">
              未登録の品目があります。まず上のカードから登録すると、食材リストに含められます。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
