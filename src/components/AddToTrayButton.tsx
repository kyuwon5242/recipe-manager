"use client";

import { useEffect, useState } from "react";
import { useMealPlanTray } from "@/lib/meal-plan-tray/context";
import { toTrayGenre } from "@/types/meal-plan-tray";
import type { TraySlotAssignment } from "@/types/meal-plan-tray";

const ADDED_CLASS =
  "max-w-full truncate rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400";

// ドラッグ&ドロップがしづらいスマホでも献立トレイに追加できるよう、
// タップだけで完結するボタン。レシピ一覧・レシピ詳細・AI提案カードから
// 共通で使う。登録済みレシピ(recipeIdを持つもの)は、すでにトレイに
// 入っている間は「追加済み」のまま固定表示し、再追加できないようにする。
export function AddToTrayButton({
  genre,
  assignment,
  className,
}: {
  genre: string | null;
  assignment: TraySlotAssignment;
  className?: string;
}) {
  const { addToTray, isRecipeInTray } = useMealPlanTray();
  const [status, setStatus] = useState<"idle" | "full">("idle");
  const [justAdded, setJustAdded] = useState(false);

  const alreadyAdded = assignment.kind === "existing" && isRecipeInTray(assignment.recipeId);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 500);
    return () => clearTimeout(timer);
  }, [justAdded]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (alreadyAdded) return;
    const ok = addToTray(toTrayGenre(genre), assignment);
    if (ok) {
      setStatus("idle");
      setJustAdded(true);
    } else {
      setStatus("full");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  const label = alreadyAdded ? "✅ 追加済み" : status === "full" ? "満杯です" : "🧺 献立トレイに追加";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={alreadyAdded}
      title={
        alreadyAdded
          ? "すでに献立トレイに追加されています"
          : "タップすると、献立トレイに追加されます"
      }
      style={justAdded ? { animation: "tray-add-pop 0.45s ease" } : undefined}
      className={
        alreadyAdded
          ? ADDED_CLASS
          : className ??
            "max-w-full truncate rounded-full border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 active:scale-95"
      }
    >
      {label}
    </button>
  );
}
