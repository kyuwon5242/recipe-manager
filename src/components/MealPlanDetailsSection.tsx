"use client";

import { useRef, useState, useTransition } from "react";
import { RecipeLink } from "@/components/RecipeLink";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { updateShoppingListMealMemo } from "@/app/shopping-lists/actions";

const SYNC_DEBOUNCE_MS = 1200;

type SyncState = "idle" | "pending" | "saving" | "saved" | "error";

type MealPlanRecipe = {
  id: string;
  title: string;
  genre: string | null;
  category: string | null;
  servings: number | null;
};

// 買い物リスト詳細の下部にある「対象の献立」欄。普段は閉じておき、見出しを
// 押すと展開して、もとになったレシピと献立メモ(買い物メモとは別)を確認・
// 編集できるようにする。
export function MealPlanDetailsSection({
  listId,
  recipes,
  initialMealMemo,
}: {
  listId: string;
  recipes: MealPlanRecipe[];
  initialMealMemo: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [memo, setMemo] = useState(initialMealMemo ?? "");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMemoChange(value: string) {
    setMemo(value);
    setSyncState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSyncState("saving");
      startTransition(async () => {
        try {
          await updateShoppingListMealMemo(listId, value.trim() || null);
          setSyncState("saved");
          setTimeout(() => setSyncState((s) => (s === "saved" ? "idle" : s)), 1500);
        } catch {
          setSyncState("error");
        }
      });
    }, SYNC_DEBOUNCE_MS);
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-700"
      >
        <span>🍽️ 対象の献立</span>
        <span className="text-gray-400">{expanded ? "閉じる ▾" : "開く ▸"}</span>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-4">
          {recipes.length === 0 ? (
            <p className="text-sm text-gray-500">この買い物リストに紐づくレシピはありません。</p>
          ) : (
            <ul className="space-y-2">
              {recipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <RecipeLink recipeId={recipe.id} className="font-medium text-brand-700 hover:underline">
                    {recipe.title}
                  </RecipeLink>
                  <div className="flex items-center gap-2">
                    {recipe.servings ? (
                      <span className="text-xs text-gray-400">{recipe.servings}人前</span>
                    ) : null}
                    <AddToTrayButton
                      genre={recipe.genre}
                      assignment={{
                        kind: "existing",
                        recipeId: recipe.id,
                        title: recipe.title,
                        category: recipe.category,
                        genre: recipe.genre,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">献立メモ</label>
              <span className="text-xs text-gray-400" aria-live="polite">
                {syncState === "saving"
                  ? "保存中..."
                  : syncState === "saved"
                    ? "保存しました"
                    : syncState === "error"
                      ? "保存に失敗しました"
                      : ""}
              </span>
            </div>
            <textarea
              value={memo}
              onChange={(e) => handleMemoChange(e.target.value)}
              placeholder="例: 今日は栄養バランス重視、子どもが苦手な野菜を混ぜてみた、など"
              className="mt-1 h-[33vh] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
