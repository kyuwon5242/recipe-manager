"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MealPlanTrayFab } from "@/components/MealPlanTrayFab";

const FAB_BUTTON_CLASS =
  "flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 active:scale-95";

// 食材図鑑ゲーム(/game配下)にいる間は、他画面と関係の薄い献立トレイボタンの
// 代わりに、ガチャ・クイズへのフローティングボタンを同じ位置に表示する。
export function GlobalFab() {
  const pathname = usePathname();
  const inGame = pathname?.startsWith("/game") ?? false;

  if (inGame) {
    return (
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2">
        <Link href="/game/quiz" className={FAB_BUTTON_CLASS}>
          <span aria-hidden="true" className="text-lg">
            ❓
          </span>
          クイズに挑戦
        </Link>
        <Link href="/game/gacha" className={FAB_BUTTON_CLASS}>
          <span aria-hidden="true" className="text-lg">
            🎁
          </span>
          ガチャを引く
        </Link>
      </div>
    );
  }

  return <MealPlanTrayFab />;
}
