"use client";

import { useEffect, useRef, useState } from "react";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { MealPlanTrayModal } from "@/components/MealPlanTrayModal";

// 画面右下に固定表示される献立トレイの入口ボタン。スクロールしても
// 常に同じ位置に残り、タップするとモーダルでトレイの内容を表示する。
// ページの文字と重なって邪魔にならないよう、普段はアイコンのみの丸ボタン
// にしておき、1回タップで現在件数の分かるピル型表示に展開、もう1回タップ
// でモーダルを開く2段階方式にしている。
// ページ遷移のたびに文字を隠したままにしないよう、呼び出し側(GlobalFab)で
// pathnameをkeyにしてこのコンポーネントごと再マウントし、展開状態をリセット
// している。
export function MealPlanTrayFab() {
  const { slots } = useMealPlanTray();
  const [expanded, setExpanded] = useState(false);
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

  function handleClose() {
    setOpen(false);
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        title="献立トレイを開く"
        aria-label="献立トレイを開く"
        style={bump ? { animation: "tray-fab-bump 0.4s ease" } : undefined}
        className="fixed bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
      >
        <span aria-hidden="true">🧺</span>
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-brand-700">
            {count}
          </span>
        ) : null}
      </button>
    );
  }

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
      {open ? <MealPlanTrayModal onClose={handleClose} /> : null}
    </>
  );
}
