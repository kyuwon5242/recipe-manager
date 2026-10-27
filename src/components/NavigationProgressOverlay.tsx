"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";

// クリックから実際に画面が切り替わるまでの間、「処理が進んでいる」ことを
// 示す全画面オーバーレイ。Next.jsのloading.tsx(Suspense)は、同じレイアウトを
// 共有する画面間の遷移(例: /game配下のページ同士の行き来)では再表示され
// ないことがあり、ボタンを押しても何も起きていないように見えてしまう。
// ここではクリックされたリンクとURLの実際の変化を直接見て判定するため、
// アプリ内のどの画面遷移でも一貫して表示できる。
//
// 即時に終わる遷移で毎回チラつくのを避けるため、表示まで少し待ち
// (SHOW_DELAY_MS)、万一URLが変化しないまま固まった場合に備えて
// 安全装置のタイムアウトも入れている。
const SHOW_DELAY_MS = 150;
const SAFETY_TIMEOUT_MS = 15000;

export function NavigationProgressOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;

  const [pending, setPending] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }

  // 遷移先のURLに実際に切り替わったら(=ナビゲーション完了)オーバーレイを消す。
  // HeaderNavと同様、レンダー中にlocationの変化を検知して状態を調整する
  // パターン(useEffectより無駄な再描画が少ない)。
  const [lastLocationKey, setLastLocationKey] = useState(locationKey);
  if (locationKey !== lastLocationKey) {
    setLastLocationKey(locationKey);
    setPending(false);
  }

  // タイマー(ref)の後始末はrender中には行えないため、locationKeyの変化を
  // 検知した直後にeffectで行う。
  useEffect(() => {
    clearTimers();
  }, [locationKey]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const currentKey = `${window.location.pathname}${window.location.search}`;
      const nextKey = `${url.pathname}${url.search}`;
      if (nextKey === currentKey) return;

      clearTimers();
      showTimerRef.current = setTimeout(() => setPending(true), SHOW_DELAY_MS);
      safetyTimerRef.current = setTimeout(() => setPending(false), SAFETY_TIMEOUT_MS);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-paper/80 backdrop-blur-sm"
    >
      <Image
        src="/manager-icon.png"
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 rounded-full object-cover shadow-brand"
        style={{ animation: "nod-think 1.6s ease-in-out infinite" }}
      />
      <p className="text-sm font-medium text-gray-500">読み込み中...</p>
    </div>
  );
}
