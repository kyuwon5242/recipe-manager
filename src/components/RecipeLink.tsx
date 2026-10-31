"use client";

import type { ReactNode } from "react";
import { useRecipeDetailModal } from "@/lib/recipe-detail-modal/context";

// `<Link href={`/recipes/${id}`}>` の代わりに使う共通コンポーネント。見た目は
// 既存のリンクと同じclassNameのまま、クリックでページ遷移せずレシピ詳細を
// ポップアップ表示する。
export function RecipeLink({
  recipeId,
  servings,
  className,
  children,
}: {
  recipeId: string;
  // 献立登録済みの人数など、レシピ本来の人数より優先して開きたい人数が
  // 分かっている場合に指定する(例: トップページの「今回つくるレシピ」)。
  servings?: number | null;
  className?: string;
  children: ReactNode;
}) {
  const { openRecipe } = useRecipeDetailModal();

  return (
    <button type="button" onClick={() => openRecipe(recipeId, servings)} className={className}>
      {children}
    </button>
  );
}
