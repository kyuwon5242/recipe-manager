"use client";

import { useState } from "react";

export type HelpItem = { label: string; desc: string };

// 画面ごとの「?」ボタン。ホバー前提のtitleツールチップはスマホでほぼ機能
// しないため、タップで開閉するモーダル(スマホでは下からのシート)にしている。
export function HelpPanel({ title, items }: { title: string; items: HelpItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="この画面の使い方"
        aria-label="この画面の使い方"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-500 transition hover:bg-gray-50 active:scale-95"
      >
        ?
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-raised sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">{title}の使い方</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 active:scale-95"
              >
                ×
              </button>
            </div>
            <ul className="mt-4 space-y-4">
              {items.map((item) => (
                <li key={item.label}>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
