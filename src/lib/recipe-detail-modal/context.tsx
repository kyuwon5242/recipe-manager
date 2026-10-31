"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { getRecipeDetailForModal } from "@/app/recipes/actions";
import type { RecipeDetail } from "@/lib/recipes/get-recipe-detail";
import type { Recipe } from "@/types/recipe";

type CacheEntry = { status: "loading" | "loaded" | "error"; detail: RecipeDetail | null };
type Cache = Record<string, CacheEntry>;

type RecipeDetailModalContextValue = {
  openRecipeId: string | null;
  entry: CacheEntry | null;
  // 献立トレイ・トップページの「今回つくるレシピ」など、登録済みの人数が
  // 分かっている文脈から開いた場合の初期表示人数(無ければnull=レシピ本来の
  // 人数で開く)。
  initialServings: number | null;
  // クリックで開く。キャッシュ済みならサーバーリクエスト無しで即表示する。
  openRecipe: (id: string, initialServings?: number | null) => void;
  closeRecipe: () => void;
  // お気に入り切替など、モーダル内の操作結果をキャッシュへ即時反映する
  // (サーバー側はrevalidatePathされるが、モーダルのキャッシュはページ
  // 遷移を伴わないため自動では更新されないため)。
  patchCachedRecipe: (id: string, patch: Partial<Recipe>) => void;
};

const RecipeDetailModalContext = createContext<RecipeDetailModalContextValue | null>(null);

export function RecipeDetailModalProvider({ children }: { children: ReactNode }) {
  const [openRecipeId, setOpenRecipeIdState] = useState<string | null>(null);
  // openRecipeIdも同じ理由(updater関数の実行タイミングが同期とは限らない)で、
  // closeRecipe内の判定にはrefの同期読み取りを使う。
  const openRecipeIdRef = useRef<string | null>(null);
  const setOpenRecipeId = useCallback((id: string | null) => {
    openRecipeIdRef.current = id;
    setOpenRecipeIdState(id);
  }, []);
  const [initialServings, setInitialServings] = useState<number | null>(null);
  const [cache, setCacheState] = useState<Cache>({});
  // setCacheのupdater関数がReactの都合で同期的に呼ばれるとは限らないため、
  // 「取得すべきか」の判定をupdater内の副作用(shouldFetchフラグ)に頼ると、
  // 直前に他の状態更新が重なっている場合にupdaterの実行が遅延し、取得すべき
  // 場面でも取得されずに固まったままになることがある(2026-10-31、スマホで
  // 2件目以降のレシピ詳細が開けない不具合の原因)。refなら常に同期的に最新値
  // を読み書きできるため、判定はcacheRef側で行う。
  const cacheRef = useRef<Cache>({});
  const setCache = useCallback((updater: (prev: Cache) => Cache) => {
    cacheRef.current = updater(cacheRef.current);
    setCacheState(cacheRef.current);
  }, []);

  const load = useCallback(
    (id: string) => {
      // 進行中の取得、または取得済み(成功)はそのまま使う。失敗やnot-found
      // (detailがない)はここで素通りさせ、再取得させる(固まったまま
      // 二度と表示できなくなるのを防ぐ)。
      const current = cacheRef.current[id];
      if (current && (current.status === "loading" || current.detail)) return;
      setCache((prev) => ({ ...prev, [id]: { status: "loading", detail: null } }));

      // モバイルの不安定な通信などでリクエストが応答なく固まった場合、
      // "loading"のまま永久に戻ってこなくなるのを避けるためのタイムアウト。
      const timeoutId = setTimeout(() => {
        setCache((prev) => (prev[id]?.status === "loading" ? { ...prev, [id]: { status: "error", detail: null } } : prev));
      }, 15000);

      getRecipeDetailForModal(id)
        .then((detail) => {
          clearTimeout(timeoutId);
          setCache((prev) => ({ ...prev, [id]: { status: "loaded", detail } }));
        })
        .catch(() => {
          clearTimeout(timeoutId);
          setCache((prev) => ({ ...prev, [id]: { status: "error", detail: null } }));
        });
    },
    [setCache]
  );

  const openRecipe = useCallback(
    (id: string, servings?: number | null) => {
      setOpenRecipeId(id);
      setInitialServings(servings && servings > 0 ? servings : null);
      load(id);
    },
    [load, setOpenRecipeId]
  );

  const closeRecipe = useCallback(() => {
    // 失敗/未解決のまま閉じた場合は、次にタップしたとき自動で再取得される
    // ようキャッシュを消しておく(エラー画面を出さず、閉じて再タップする
    // だけで直せるようにするため)。成功済みのキャッシュは消さずに残す。
    const idToClear = openRecipeIdRef.current;
    setOpenRecipeId(null);
    if (idToClear) {
      setCache((prev) => {
        const current = prev[idToClear];
        if (!current || current.detail) return prev;
        const next = { ...prev };
        delete next[idToClear];
        return next;
      });
    }
  }, [setCache, setOpenRecipeId]);

  const patchCachedRecipe = useCallback(
    (id: string, patch: Partial<Recipe>) => {
      setCache((prev) => {
        const current = prev[id];
        if (!current?.detail) return prev;
        return {
          ...prev,
          [id]: { ...current, detail: { ...current.detail, recipe: { ...current.detail.recipe, ...patch } } },
        };
      });
    },
    [setCache]
  );

  const entry = openRecipeId ? (cache[openRecipeId] ?? null) : null;

  const value = useMemo(
    () => ({ openRecipeId, entry, initialServings, openRecipe, closeRecipe, patchCachedRecipe }),
    [openRecipeId, entry, initialServings, openRecipe, closeRecipe, patchCachedRecipe]
  );

  return <RecipeDetailModalContext.Provider value={value}>{children}</RecipeDetailModalContext.Provider>;
}

export function useRecipeDetailModal() {
  const ctx = useContext(RecipeDetailModalContext);
  if (!ctx) {
    throw new Error("useRecipeDetailModal must be used within RecipeDetailModalProvider");
  }
  return ctx;
}
