"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ExistingRecipeSuggestionCard } from "@/components/ExistingRecipeSuggestionCard";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { suggestMealPlan, type MealPlanResult, type MealPlanState } from "@/app/menu-plan/actions";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { toTrayGenre } from "@/types/meal-plan-tray";

const initialState: MealPlanState = { result: null, error: null };
const SLOT_GENRES = ["主食", "主菜", "副菜", "汁物"] as const;

// 詳細画面(ポップアップ)に移動して戻ってきても、直前のリクエスト内容・
// 提案結果が消えないよう、タブを閉じるまで保持するsessionStorageに保存する。
const STORAGE_KEY = "recipe-app.menu-plan.last";

type StoredMealPlan = {
  request: string;
  counts: Record<string, string>;
  result: MealPlanResult;
};

function loadStored(): StoredMealPlan | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredMealPlan;
  } catch {
    return null;
  }
}

export function MealPlanForm() {
  const [state, formAction, isPending] = useActionState(suggestMealPlan, initialState);
  const { addToTray } = useMealPlanTray();
  const [addedAll, setAddedAll] = useState(false);
  const [stored, setStored] = useState<StoredMealPlan | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const lastSubmittedRef = useRef<{ request: string; counts: Record<string, string> } | null>(null);

  useEffect(() => {
    // sessionStorageはサーバーで読めないため、SSRとのhydration不一致を避けて
    // マウント後にクライアント側だけで読み込む(lazy初期値にすると不一致になる)。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored(loadStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!state.result || !lastSubmittedRef.current) return;
    const next: StoredMealPlan = { ...lastSubmittedRef.current, result: state.result };
    setStored(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sessionStorageが使えない環境では諦める(プライベートウィンドウ等)
    }
  }, [state.result]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const counts: Record<string, string> = {};
    for (const genre of SLOT_GENRES) {
      counts[genre] = String(formData.get(`count_${genre}`) ?? "1");
    }
    lastSubmittedRef.current = { request: String(formData.get("request") ?? ""), counts };
  }

  const effectiveResult = state.result ?? (hydrated ? (stored?.result ?? null) : null);

  const existingSlots = useMemo(
    () => (effectiveResult?.slots ?? []).filter((s) => s.kind === "existing"),
    [effectiveResult]
  );

  function handleAddAllToTray() {
    for (const slot of existingSlots) {
      const genre = slot.slot.replace(/\d+$/, "");
      addToTray(toTrayGenre(genre), {
        kind: "existing",
        recipeId: slot.recipeId,
        title: slot.title,
        category: null,
        genre,
      });
    }
    setAddedAll(true);
  }

  return (
    <div className="mt-6 space-y-6">
      <form
        key={hydrated ? "restored" : "initial"}
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
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
                  defaultValue={stored?.counts?.[genre] ?? "1"}
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
            defaultValue={stored?.request ?? ""}
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

      {effectiveResult ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{effectiveResult.planTitle}</h2>
          <ul className="space-y-3">
            {effectiveResult.slots.map((slot, i) => (
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

          {existingSlots.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={handleAddAllToTray}
                className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
              >
                🧺 この献立をまとめて献立トレイに追加
              </button>
              {addedAll ? (
                <p className="mt-2 text-xs text-brand-700">
                  献立トレイに追加しました。画面右下の「献立トレイ」から食材リスト作成へ進めます。
                </p>
              ) : null}
            </div>
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
