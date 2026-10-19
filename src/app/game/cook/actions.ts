"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { DISH_CATALOG } from "@/lib/game/dish-catalog";
import { resolveDishImageSrc } from "@/lib/game/dish-image";

type MakeDishRow = {
  dish_id: string;
  achieved_at: string;
  cards_consumed: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  recipe_not_found: "レシピが見つかりませんでした。",
  dish_already_made: "このレシピはすでに家族で達成済みです。",
  dish_no_cards: "このレシピには対応する食材カードがありません。",
  dish_ingredients_missing: "必要な食材カードが足りません。図鑑を確認してください。",
};

export type AchievedDish = {
  title: string;
  category: string;
  genre: string;
  imageSrc: string | null;
};

export type MakeDishResult = {
  error: string | null;
  dish: AchievedDish | null;
};

export async function makeDish(recipeId: string): Promise<MakeDishResult> {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const { error } = await supabase
    .rpc("make_dish", { p_family_id: familyId, p_recipe_id: recipeId })
    .maybeSingle<MakeDishRow>();

  if (error) {
    const known = Object.entries(ERROR_MESSAGES).find(([code]) => error.message.includes(code));
    return { error: known ? known[1] : `料理を作るのに失敗しました: ${error.message}`, dish: null };
  }

  revalidatePath("/game/cook");
  revalidatePath("/game");
  revalidatePath("/game/cards");
  revalidatePath("/game/dishes");

  // 画像パス解決(resolveDishImageSrc)はfsでファイル存在を確認するため、
  // クライアントから渡された値ではなくDISH_CATALOG(固定の信頼できる文字列)の
  // タイトルのみを渡す(パストラバーサル対策)。
  const { data: recipe } = await supabase.from("recipes").select("title").eq("id", recipeId).maybeSingle();
  const catalogDish = recipe ? DISH_CATALOG.find((d) => d.title === recipe.title) : null;

  return {
    error: null,
    dish: catalogDish
      ? { title: catalogDish.title, category: catalogDish.category, genre: catalogDish.genre, imageSrc: resolveDishImageSrc(catalogDish.title) }
      : null,
  };
}
