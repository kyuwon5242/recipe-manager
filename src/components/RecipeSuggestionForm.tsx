"use client";

import { useActionState } from "react";
import { NewRecipeIdeaCard } from "@/components/NewRecipeIdeaCard";
import {
  suggestRecipes,
  type RecipeSuggestionState,
} from "@/app/recipe-suggestions/actions";

const initialState: RecipeSuggestionState = { result: null, error: null };

export function RecipeSuggestionForm() {
  const [state, formAction, isPending] = useActionState(suggestRecipes, initialState);

  return (
    <div className="mt-6 space-y-6">
      <form action={formAction} className="space-y-3">
        <textarea
          name="request"
          rows={3}
          required
          placeholder="例: 和食で甘いあったかい物が食べたい / 旬の食材を使った料理が食べたい / キャベツと豚肉で何か作りたい"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "考え中..." : "提案してもらう"}
        </button>
      </form>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <section>
          <h2 className="text-lg font-semibold">新しいレシピ案</h2>
          {state.result.new_ideas.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">提案が見つかりませんでした。</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {state.result.new_ideas.map((idea, i) => (
                <NewRecipeIdeaCard key={i} idea={idea} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
