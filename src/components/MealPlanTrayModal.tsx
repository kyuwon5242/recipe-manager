"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { readDragPayload } from "@/lib/meal-plan-tray/drag";
import { registerRecipeIdea } from "@/app/recipes/actions";
import { useIsTouchDevice } from "@/lib/hooks/useIsTouchDevice";
import { TRAY_GENRES, toTrayGenre } from "@/types/meal-plan-tray";

export function MealPlanTrayModal({ onClose }: { onClose: () => void }) {
  const { slots, addToTray, removeSlot, setServings, clearAll, mealMemo, setMealMemo } = useMealPlanTray();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isTouch = useIsTouchDevice();

  const ideaCount = slots.filter((s) => s.assignment.kind === "idea").length;

  function handleReset() {
    if (slots.length === 0) return;
    const ok = window.confirm("献立トレイの内容をすべて削除します。よろしいですか?");
    if (!ok) return;
    clearAll();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const payload = readDragPayload(e);
    if (!payload) return;
    const genre = toTrayGenre(payload.kind === "existing" ? payload.genre : payload.idea.recipe.genre);
    addToTray(genre, payload);
  }

  function handleProceed() {
    setError(null);
    if (slots.length === 0) {
      setError("レシピが1件も追加されていません");
      return;
    }
    if (ideaCount > 0) {
      const ok = window.confirm(
        `${ideaCount}件の未登録レシピがあります。登録してから食材リスト作成に進みますか?`
      );
      if (!ok) return;
    }

    startSubmit(async () => {
      try {
        const parts: string[] = [];
        for (const slot of slots) {
          if (slot.assignment.kind === "existing") {
            parts.push(`${slot.assignment.recipeId}:${slot.servings}`);
          } else {
            const newId = await registerRecipeIdea(slot.assignment.idea);
            parts.push(`${newId}:${slot.servings}`);
          }
        }
        const memoParam = mealMemo.trim() ? `&mealMemo=${encodeURIComponent(mealMemo.trim())}` : "";
        router.push(`/shopping-list?plan=${parts.join(",")}${memoParam}`);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-raised sm:max-w-md sm:rounded-2xl ${
          isDragOver ? "ring-2 ring-brand-400" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="flex items-center gap-1.5 text-lg font-bold">
            <span aria-hidden="true">🧺</span>
            献立トレイ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-gray-500">
            カードの「🧺 献立トレイに追加」ボタンで追加できます
            {isTouch ? "" : "(PCではドラッグ&ドロップでここに追加もできます)"}。
          </p>

          {slots.length === 0 ? (
            <p className="mt-6 text-center text-sm text-gray-400">まだレシピが追加されていません。</p>
          ) : (
            <div className="mt-3 space-y-4">
              {TRAY_GENRES.map((genre) => {
                const items = slots.filter((s) => s.genre === genre);
                if (items.length === 0) return null;
                return (
                  <div key={genre}>
                    <p className="text-xs font-semibold text-gray-500">{genre}</p>
                    <div className="mt-1.5 space-y-2">
                      {items.map((slot) => (
                        <div key={slot.id} className="rounded-md border border-gray-200 bg-gray-50 p-2 text-sm">
                          <p className="text-gray-800">
                            {slot.assignment.kind === "existing"
                              ? slot.assignment.title
                              : slot.assignment.idea.title}
                            {slot.assignment.kind === "idea" ? (
                              <span className="ml-1 text-amber-600">(未登録)</span>
                            ) : null}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <label className="flex items-center gap-1 text-gray-500">
                              人前
                              <select
                                value={slot.servings}
                                onChange={(e) => setServings(slot.id, Number(e.target.value))}
                                className="rounded-md border border-gray-300 px-1 py-0.5"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeSlot(slot.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500">献立メモ(任意)</label>
            <textarea
              value={mealMemo}
              onChange={(e) => setMealMemo(e.target.value)}
              rows={2}
              placeholder="例: 今日は栄養バランス重視、子どもが苦手な野菜を混ぜてみた、など"
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}

        <div className="flex gap-2 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={slots.length === 0}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={isSubmitting || slots.length === 0}
            className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
          >
            {isSubmitting ? "登録中..." : "食材リストを作成へ進む"}
          </button>
        </div>
      </div>
    </div>
  );
}
