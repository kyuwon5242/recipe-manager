"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { DishCardVisual } from "@/components/DishCardVisual";
import type { AchievedDish } from "@/app/game/dishes/actions";

const MakeDishContext = createContext<((dish: AchievedDish) => void) | null>(null);

export function useNotifyDishAchieved() {
  const notify = useContext(MakeDishContext);
  if (!notify) throw new Error("useNotifyDishAchieved must be used within MakeDishProvider");
  return notify;
}

// 「料理を作る」達成直後の演出(料理写真つきモーダル)を、候補↔達成済みの
// リスト再描画(makeDish内のrevalidatePathで候補リストから達成済みリストへ
// 要素が移動し、ボタン自身が属するDOMごと消える)に巻き込まれないよう、
// 候補・達成済み両リストを包むこの常駐Providerで状態を持つ。
export function MakeDishProvider({ children }: { children: React.ReactNode }) {
  const [achieved, setAchieved] = useState<AchievedDish | null>(null);

  return (
    <MakeDishContext.Provider value={setAchieved}>
      {children}
      {achieved ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAchieved(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="gacha-reveal w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-raised"
          >
            <p className="text-sm font-bold text-brand-700">🎉 達成しました!</p>
            <div className="mx-auto mt-3 w-48 max-w-full">
              <DishCardVisual
                title={achieved.title}
                category={achieved.category}
                genre={achieved.genre}
                src={achieved.imageSrc}
                isAchieved
              />
            </div>
            {!achieved.imageSrc ? (
              <p className="mt-2 text-xs text-gray-400">写真は準備中です。公開されるまでお待ちください。</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAchieved(null)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 active:scale-95"
              >
                閉じる
              </button>
              <Link
                href={`/game/dishes/${encodeURIComponent(achieved.title)}`}
                onClick={() => setAchieved(null)}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
              >
                料理図鑑で見る
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </MakeDishContext.Provider>
  );
}
