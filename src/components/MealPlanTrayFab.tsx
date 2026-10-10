"use client";

import { useEffect, useRef, useState } from "react";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { MealPlanTrayModal } from "@/components/MealPlanTrayModal";

// 画面右下に固定表示される献立トレイの入口ボタン。スクロールしても
// 常に同じ位置に残り、タップするとモーダルでトレイの内容を表示する。
export function MealPlanTrayFab() {
  const { slots } = useMealPlanTray();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const prevCountRef = useRef(slots.length);
  const count = slots.length;

  useEffect(() => {
    if (count > prevCountRef.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 400);
      prevCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="献立トレイを開く"
        style={bump ? { animation: "tray-fab-bump 0.4s ease" } : undefined}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
      >
        <span aria-hidden="true" className="text-lg">
          🧺
        </span>
        献立トレイ
        {count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-brand-700">
            {count}
          </span>
        ) : null}
      </button>
      {open ? <MealPlanTrayModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
