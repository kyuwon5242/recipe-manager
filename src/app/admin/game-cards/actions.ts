"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { CARD_RARITIES, type CardRarity } from "@/lib/game/cards";

export type CardFormState = {
  error: string | null;
};

function isRarity(value: string): value is CardRarity {
  return (CARD_RARITIES as readonly string[]).includes(value);
}

export async function createGameCard(
  _prevState: CardFormState,
  formData: FormData
): Promise<CardFormState> {
  const { supabase } = await requireAdmin();

  const ingredientId = String(formData.get("ingredient_id") ?? "");
  const rarity = String(formData.get("rarity") ?? "");
  const illustrationUrl = String(formData.get("illustration_url") ?? "").trim();
  const triviaKidsText = String(formData.get("trivia_kids_text") ?? "").trim();
  const triviaAdultText = String(formData.get("trivia_adult_text") ?? "").trim();
  const nutritionSummary = String(formData.get("nutrition_summary") ?? "").trim();

  if (!ingredientId) {
    return { error: "食材を選択してください" };
  }
  if (!isRarity(rarity)) {
    return { error: "レアリティを選択してください" };
  }

  const { error } = await supabase.from("game_cards").insert({
    ingredient_id: ingredientId,
    rarity,
    illustration_url: illustrationUrl || null,
    trivia_kids_text: triviaKidsText || null,
    trivia_adult_text: triviaAdultText || null,
    nutrition_summary: nutritionSummary || null,
  });

  if (error) {
    return { error: `カードの作成に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/game-cards");
  revalidatePath("/game/cards");
  return { error: null };
}

export async function deleteGameCard(cardId: string): Promise<CardFormState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("game_cards").delete().eq("id", cardId);
  if (error) {
    return { error: `カードの削除に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/game-cards");
  revalidatePath("/game/cards");
  return { error: null };
}
