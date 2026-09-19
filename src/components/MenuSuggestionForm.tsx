"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe } from "@/app/recipes/actions";
import {
  suggestMenu,
  type MenuSuggestionResult,
  type MenuSuggestionState,
} from "@/app/menu-suggestions/actions";

const initialState: MenuSuggestionState = { result: null, error: null };

function NewIdeaCard({ idea }: { idea: MenuSuggestionResult["new_ideas"][number] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <p className="font-semibold">{idea.title}</p>
      <p className="mt-1 text-sm text-gray-500">{idea.reason}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-sm text-emerald-700 hover:underline"
      >
        {expanded ? "閉じる" : "詳細を見て登録する"}
      </button>
      {expanded ? (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <RecipeForm
            action={createRecipe}
            submitLabel="このレシピを登録する"
            initialRecipe={idea.recipe}
            initialIngredients={idea.ingredients}
          />
        </div>
      ) : null}
    </li>
  );
}

export function MenuSuggestionForm() {
  const [state, formAction, isPending] = useActionState(suggestMenu, initialState);

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
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">登録済みレシピからの提案</h2>
            {state.result.from_existing.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                合いそうな登録済みレシピは見つかりませんでした。
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {state.result.from_existing.map((item) => (
                  <li
                    key={item.recipe_id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <Link
                      href={`/recipes/${item.recipe_id}`}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">AIによる新しいレシピ案</h2>
            {state.result.new_ideas.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                新しい提案はありません。
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {state.result.new_ideas.map((idea, i) => (
                  <NewIdeaCard key={i} idea={idea} />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
