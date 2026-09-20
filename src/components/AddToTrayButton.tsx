"use client";

import { useState } from "react";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { toTrayGenre } from "@/types/meal-plan-tray";
import type { TraySlotAssignment } from "@/types/meal-plan-tray";

// ドラッグ&ドロップがしづらいスマホでも献立トレイに追加できるよう、
// タップだけで完結するボタン。レシピ一覧・AI提案カードから共通で使う。
export function AddToTrayButton({
  genre,
  assignment,
  className,
}: {
  genre: string | null;
  assignment: TraySlotAssignment;
  className?: string;
}) {
  const { addToTray } = useMealPlanTray();
  const [status, setStatus] = useState<"idle" | "added" | "full">("idle");

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ok = addToTray(toTrayGenre(genre), assignment);
    setStatus(ok ? "added" : "full");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "rounded-full border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 active:scale-95"
      }
    >
      {status === "added" ? "追加しました" : status === "full" ? "この品目は満杯です" : "+ 献立トレイに追加"}
    </button>
  );
}
