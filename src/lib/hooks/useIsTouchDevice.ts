"use client";

import { useEffect, useState } from "react";

// タッチ操作主体の端末(スマホ・タブレット)かどうかを判定する。
// HTML5のドラッグ&ドロップはマウス操作前提でタッチでは実用的に機能しない
// ため、ドラッグ機能をPC相当の端末(ポインタが高精度なマウス等)に限定する
// ために使う。
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(pointer: coarse)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isTouch;
}
