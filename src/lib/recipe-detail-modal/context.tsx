"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getRecipeDetailForModal } from "@/app/recipes/actions";
import type { RecipeDetail } from "@/lib/recipes/get-recipe-detail";
import type { Recipe } from "@/types/recipe";

type CacheEntry = { status: "loading" | "loaded" | "error"; detail: RecipeDetail | null };
type Cache = Record<string, CacheEntry>;

type RecipeDetailModalContextValue = {
  openRecipeId: string | null;
  entry: CacheEntry | null;
  // クリックで開く。キャッシュ済みならサーバーリクエスト無しで即表示する。
  openRecipe: (id: string) => void;
  closeRecipe: () => void;
  // カードにマウスオーバー/タッチした時点で裏取得を始めておく(一覧の
  // 初期表示自体は変えず、実際に開こうとしたレシピだけ先読みする)。
  prefetchRecipe: (id: string) => void;
  // お気に入り切替など、モーダル内の操作結果をキャッシュへ即時反映する
  // (サーバー側はrevalidatePathされるが、モーダルのキャッシュはページ
  // 遷移を伴わないため自動では更新されないため)。
  patchCachedRecipe: (id: string, patch: Partial<Recipe>) => void;
};

const RecipeDetailModalContext = createContext<RecipeDetailModalContextValue | null>(null);

export function RecipeDetailModalProvider({ children }: { children: ReactNode }) {
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
  const [cache, setCache] = useState<Cache>({});

  const load = useCallback((id: string) => {
    let shouldFetch = false;
    setCache((prev) => {
      if (prev[id]) return prev;
      shouldFetch = true;
      return { ...prev, [id]: { status: "loading", detail: null } };
    });
    if (!shouldFetch) return;

    getRecipeDetailForModal(id)
      .then((detail) => {
        setCache((prev) => ({ ...prev, [id]: { status: "loaded", detail } }));
      })
      .catch(() => {
        setCache((prev) => ({ ...prev, [id]: { status: "error", detail: null } }));
      });
  }, []);

  const openRecipe = useCallback(
    (id: string) => {
      setOpenRecipeId(id);
      load(id);
    },
    [load]
  );

  const closeRecipe = useCallback(() => setOpenRecipeId(null), []);
  const prefetchRecipe = useCallback((id: string) => load(id), [load]);

  const patchCachedRecipe = useCallback((id: string, patch: Partial<Recipe>) => {
    setCache((prev) => {
      const current = prev[id];
      if (!current?.detail) return prev;
      return {
        ...prev,
        [id]: { ...current, detail: { ...current.detail, recipe: { ...current.detail.recipe, ...patch } } },
      };
    });
  }, []);

  const entry = openRecipeId ? (cache[openRecipeId] ?? null) : null;

  const value = useMemo(
    () => ({ openRecipeId, entry, openRecipe, closeRecipe, prefetchRecipe, patchCachedRecipe }),
    [openRecipeId, entry, openRecipe, closeRecipe, prefetchRecipe, patchCachedRecipe]
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
