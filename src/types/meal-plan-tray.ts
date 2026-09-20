import type { NewRecipeIdea } from "@/types/recipe-suggestion";
import { bucketGenre } from "@/lib/recipe-genre";

export const TRAY_GENRES = ["主食", "主菜", "副菜", "汁物"] as const;
export type TrayGenre = (typeof TRAY_GENRES)[number];

// レシピのジャンルを献立トレイの4品目に割り当てる。「その他」などトレイに
// 無い品目に分類された場合は、最も一般的な「主菜」を既定の置き先とする。
export function toTrayGenre(genre: string | null): TrayGenre {
  const bucket = bucketGenre(genre);
  return bucket === "その他" ? "主菜" : bucket;
}

export type TraySlotAssignment =
  | {
      kind: "existing";
      recipeId: string;
      title: string;
      category: string | null;
      genre: string | null;
    }
  | { kind: "idea"; idea: NewRecipeIdea };

export type TraySlot = {
  id: string;
  genre: TrayGenre;
  servings: number;
  assignment: TraySlotAssignment | null;
};
