"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { NewRecipeIdeaCard } from "@/components/NewRecipeIdeaCard";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import {
  suggestRecipes,
  type RecipeSuggestionResult,
  type RecipeSuggestionState,
} from "@/app/recipe-suggestions/actions";

const initialState: RecipeSuggestionState = { result: null, error: null };

// 詳細画面(ポップアップ)に移動して戻ってきても、直前のリクエスト内容・
// 提案結果が消えないよう、タブを閉じるまで保持するsessionStorageに保存する。
const STORAGE_KEY = "recipe-app.recipe-suggestions.last";

type StoredSuggestion = {
  request: string;
  result: RecipeSuggestionResult;
};

function loadStored(): StoredSuggestion | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSuggestion;
  } catch {
    return null;
  }
}

export function RecipeSuggestionForm() {
  const [state, formAction, isPending] = useActionState(suggestRecipes, initialState);
  const [stored, setStored] = useState<StoredSuggestion | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const lastSubmittedRequestRef = useRef<string>("");

  useEffect(() => {
    // sessionStorageはサーバーで読めないため、SSRとのhydration不一致を避けて
    // マウント後にクライアント側だけで読み込む(lazy初期値にすると不一致になる)。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored(loadStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!state.result) return;
    const next: StoredSuggestion = { request: lastSubmittedRequestRef.current, result: state.result };
    setStored(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sessionStorageが使えない環境では諦める(プライベートウィンドウ等)
    }
  }, [state.result]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    lastSubmittedRequestRef.current = String(formData.get("request") ?? "");
  }

  const effectiveResult = state.result ?? (hydrated ? (stored?.result ?? null) : null);

  return (
    <div className="mt-6 space-y-6">
      <form
        key={hydrated ? "restored" : "initial"}
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        <textarea
          name="request"
          rows={3}
          required
          defaultValue={stored?.request ?? ""}
          placeholder="例: 和食で甘いあったかい物が食べたい / 旬の食材を使った料理が食べたい / キャベツと豚肉で何か作りたい"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
        >
          {isPending ? "考え中..." : "提案してもらう"}
        </button>
      </form>

      {isPending ? <AIThinkingIndicator label="AIが新しいレシピ案を考え中..." /> : null}

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {effectiveResult ? (
        <section>
          <h2 className="text-lg font-semibold">新しいレシピ案</h2>
          {effectiveResult.new_ideas.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">提案が見つかりませんでした。</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {effectiveResult.new_ideas.map((idea, i) => (
                <NewRecipeIdeaCard key={i} idea={idea} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
