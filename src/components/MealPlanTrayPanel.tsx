"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { readDragPayload } from "@/lib/meal-plan-tray/drag";
import { registerRecipeIdea } from "@/app/recipes/actions";
import { useIsTouchDevice } from "@/lib/hooks/useIsTouchDevice";
import { TRAY_GENRES, type TrayGenre } from "@/types/meal-plan-tray";

export function MealPlanTrayPanel() {
  const { slots, setCount, assign, clearSlot, setServings } = useMealPlanTray();
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isTouch = useIsTouchDevice();

  const filledSlots = slots.filter((s) => s.assignment);
  const ideaCount = filledSlots.filter((s) => s.assignment?.kind === "idea").length;

  // 品数を減らすと、はみ出した枠(末尾側)は設定ごと破棄される
  // (lib/meal-plan-tray/context.tsxのrebuildGenreSlots参照)。設定済みの
  // レシピが失われる場合は、確認なしに消えてしまわないよう一言確認する。
  function handleCountChange(genre: TrayGenre, nextCount: number) {
    const current = slots.filter((s) => s.genre === genre);
    const discarded = current.slice(nextCount).filter((s) => s.assignment);
    if (discarded.length > 0) {
      const ok = window.confirm(
        `${genre}の設定済みレシピが${discarded.length}件削除されます。よろしいですか?`
      );
      if (!ok) return;
    }
    setCount(genre, nextCount);
  }

  function handleDrop(slotId: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverSlot(null);
    const payload = readDragPayload(e);
    if (!payload) return;
    assign(slotId, payload);
  }

  function handleProceed() {
    setError(null);
    if (filledSlots.length === 0) {
      setError("レシピが1件も設定されていません");
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
        for (const slot of filledSlots) {
          if (!slot.assignment) continue;
          if (slot.assignment.kind === "existing") {
            parts.push(`${slot.assignment.recipeId}:${slot.servings}`);
          } else {
            const newId = await registerRecipeIdea(slot.assignment.idea);
            parts.push(`${newId}:${slot.servings}`);
          }
        }
        router.push(`/shopping-list?plan=${parts.join(",")}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
  }

  return (
    <aside className="w-full shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-raised lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-72">
      <h2 className="flex items-center gap-1.5 font-semibold">
        <span aria-hidden="true">🧺</span>
        献立トレイ
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        カードの「🧺 献立トレイに追加」ボタンで枠に設定できます{isTouch ? "" : "(PCではドラッグ&ドロップも使えます)"}。
      </p>

      <div className="mt-3 space-y-1">
        {TRAY_GENRES.map((genre) => {
          const count = slots.filter((s) => s.genre === genre).length;
          return (
            <div key={genre} className="flex items-center justify-between text-sm">
              <span>{genre}</span>
              <select
                value={count}
                onChange={(e) => handleCountChange(genre, Number(e.target.value))}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {slots.length === 0 ? (
          <p className="text-xs text-gray-400">品数を指定すると枠が表示されます。</p>
        ) : (
          slots.map((slot) => (
            <div
              key={slot.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSlot(slot.id);
              }}
              onDragLeave={() => setDragOverSlot((cur) => (cur === slot.id ? null : cur))}
              onDrop={(e) => handleDrop(slot.id, e)}
              className={`rounded-md border-2 border-dashed p-2 text-xs transition ${
                dragOverSlot === slot.id
                  ? "border-brand-400 bg-brand-50"
                  : slot.assignment
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-200"
              }`}
            >
              <p className="font-semibold text-gray-500">{slot.genre}</p>
              {slot.assignment ? (
                <div className="mt-1">
                  <p className="text-sm text-gray-800">
                    {slot.assignment.kind === "existing"
                      ? slot.assignment.title
                      : slot.assignment.idea.title}
                    {slot.assignment.kind === "idea" ? (
                      <span className="ml-1 text-amber-600">(未登録)</span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
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
                      onClick={() => clearSlot(slot.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-gray-400">
                  {isTouch ? "未設定" : "ここにレシピをドラッグ"}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleProceed}
        disabled={isSubmitting || filledSlots.length === 0}
        className="mt-4 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
      >
        {isSubmitting ? "登録中..." : "食材リストを作成へ進む"}
      </button>
    </aside>
  );
}
