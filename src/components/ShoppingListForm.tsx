"use client";

import { useActionState } from "react";
import {
  generateShoppingList,
  type GenerateShoppingListState,
} from "@/app/shopping-list/actions";

type Recipe = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
};

const initialState: GenerateShoppingListState = { result: null, error: null };

export function ShoppingListForm({ recipes }: { recipes: Recipe[] }) {
  const [state, formAction, isPending] = useActionState(
    generateShoppingList,
    initialState
  );

  return (
    <div className="mt-6 space-y-6">
      <form action={formAction} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            レシピを選択
          </label>
          {recipes.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              レシピが登録されていません。先にレシピを登録してください。
            </p>
          ) : (
            <div className="mt-2 space-y-2 rounded-md border border-gray-200 p-3">
              {recipes.map((recipe) => (
                <label key={recipe.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="recipe_id" value={recipe.id} />
                  <span>
                    {recipe.title}
                    <span className="ml-1 text-gray-400">
                      {[recipe.category, recipe.genre].filter(Boolean).join(" / ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            手持ちの食材(自由に入力)
          </label>
          <textarea
            name="stock_text"
            rows={4}
            placeholder="例: 玉ねぎ2個、人参は少しある、醤油はまだたっぷりある"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || recipes.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "作成中..." : "買い物リストを作成"}
        </button>
      </form>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <div className="space-y-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-sm font-semibold text-emerald-800">買い物リスト</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {state.result.finalText}
            </p>
          </div>

          <details className="rounded-md border border-gray-200 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-gray-700">
              エージェントの実行ログ(学習用)
            </summary>
            <ol className="mt-3 space-y-3">
              {state.result.trace.map((step, i) => (
                <li key={i} className="rounded bg-gray-50 p-2">
                  {step.type === "assistant_text" ? (
                    <>
                      <p className="font-medium text-gray-600">🤖 モデルの発言</p>
                      <p className="mt-1 whitespace-pre-wrap">{step.text}</p>
                    </>
                  ) : step.type === "tool_call" ? (
                    <>
                      <p className="font-medium text-gray-600">
                        🔧 ツール呼び出し: {step.toolName}
                      </p>
                      <pre className="mt-1 overflow-x-auto text-xs text-gray-500">
                        {JSON.stringify(step.input, null, 2)}
                      </pre>
                    </>
                  ) : step.type === "tool_result" ? (
                    <>
                      <p className="font-medium text-gray-600">📦 ツールの結果</p>
                      <pre className="mt-1 overflow-x-auto text-xs text-gray-500">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-600">✅ 最終回答</p>
                      <p className="mt-1 whitespace-pre-wrap">{step.text}</p>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </div>
      ) : null}
    </div>
  );
}
