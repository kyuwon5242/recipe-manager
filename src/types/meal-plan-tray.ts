import type { NewRecipeIdea } from "@/types/recipe-suggestion";

export const TRAY_GENRES = ["主食", "主菜", "副菜", "汁物"] as const;
export type TrayGenre = (typeof TRAY_GENRES)[number];

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
