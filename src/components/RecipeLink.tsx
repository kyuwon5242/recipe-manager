"use client";

import type { ReactNode } from "react";
import { useRecipeDetailModal } from "@/lib/recipe-detail-modal/context";

// `<Link href={`/recipes/${id}`}>` の代わりに使う共通コンポーネント。見た目は
// 既存のリンクと同じclassNameのまま、クリックでページ遷移せずレシピ詳細を
// ポップアップ表示する。ホバー/タッチ時点で裏取得を始めておき、実際に
// 開いたときには多くの場合キャッシュ済みで即表示になる。
export function RecipeLink({
  recipeId,
  className,
  children,
}: {
  recipeId: string;
  className?: string;
  children: ReactNode;
}) {
  const { openRecipe, prefetchRecipe } = useRecipeDetailModal();

  return (
    <button
      type="button"
      onClick={() => openRecipe(recipeId)}
      onMouseEnter={() => prefetchRecipe(recipeId)}
      onTouchStart={() => prefetchRecipe(recipeId)}
      className={className}
    >
      {children}
    </button>
  );
}
