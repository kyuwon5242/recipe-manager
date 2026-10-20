"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MealPlanTrayFab } from "@/components/MealPlanTrayFab";

const FAB_BUTTON_CLASS =
  "flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 active:scale-95";

// 食材図鑑ゲーム(/game配下)にいる間は、他画面と関係の薄い献立トレイボタンの
// 代わりに、ガチャ・クイズへの入口を同じ位置に表示する。常時2つのボタンを
// 出すとページによっては他の表示と重なり見づらくなるため、普段は小さい丸
// ボタン1つだけにしておき、タップで展開してから遷移する方式にしている。
export function GlobalFab() {
  const pathname = usePathname();
  const inGame = pathname?.startsWith("/game") ?? false;

  // pathnameをkeyにして、ページ遷移のたびに開閉状態をリセットした
  // 新しいインスタンスにする(useEffectでのsetStateを避けるため)。
  if (inGame) {
    return <GameFab key={pathname} />;
  }

  return <MealPlanTrayFab key={pathname} />;
}

function GameFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2">
      {open ? (
        <>
          <Link href="/game/quiz" className={FAB_BUTTON_CLASS}>
            <span aria-hidden="true" className="text-base">
              ❓
            </span>
            クイズに挑戦
          </Link>
          <Link href="/game/gacha" className={FAB_BUTTON_CLASS}>
            <span aria-hidden="true" className="text-base">
              🎁
            </span>
            ガチャを引く
          </Link>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "ガチャ・クイズのメニューを閉じる" : "ガチャ・クイズのメニューを開く"}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
      >
        {open ? "✕" : "🎮"}
      </button>
    </div>
  );
}
