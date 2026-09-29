"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";

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

export async function makeDish(recipeId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const { error } = await supabase
    .rpc("make_dish", { p_family_id: familyId, p_recipe_id: recipeId })
    .maybeSingle<MakeDishRow>();

  if (error) {
    const known = Object.entries(ERROR_MESSAGES).find(([code]) => error.message.includes(code));
    return { error: known ? known[1] : `料理を作るのに失敗しました: ${error.message}` };
  }

  revalidatePath("/game/cook");
  revalidatePath("/game");
  revalidatePath("/game/cards");

  return { error: null };
}
