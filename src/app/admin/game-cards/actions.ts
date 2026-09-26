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

function parseMonths(monthsText: string): number[] | { error: string } {
  const months = monthsText
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s));

  if (months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
    return { error: "旬の月は1〜12の数字をカンマ区切りで入力してください(例: 6,7,8)" };
  }
  return months;
}

function readCardFields(formData: FormData) {
  return {
    rarity: String(formData.get("rarity") ?? ""),
    illustrationUrl: String(formData.get("illustration_url") ?? "").trim(),
    triviaKidsText: String(formData.get("trivia_kids_text") ?? "").trim(),
    triviaAdultText: String(formData.get("trivia_adult_text") ?? "").trim(),
    nutritionSummary: String(formData.get("nutrition_summary") ?? "").trim(),
    reading: String(formData.get("reading") ?? "").trim(),
    monthsText: String(formData.get("season_months") ?? ""),
  };
}

export async function createGameCard(
  _prevState: CardFormState,
  formData: FormData
): Promise<CardFormState> {
  const { supabase } = await requireAdmin();

  const ingredientId = String(formData.get("ingredient_id") ?? "");
  const fields = readCardFields(formData);

  if (!ingredientId) {
    return { error: "食材を選択してください" };
  }
  if (!isRarity(fields.rarity)) {
    return { error: "レアリティを選択してください" };
  }
  const months = parseMonths(fields.monthsText);
  if (!Array.isArray(months)) {
    return { error: months.error };
  }

  const { error: ingredientError } = await supabase
    .from("ingredients_master")
    .update({ season_months: months, reading: fields.reading || null })
    .eq("id", ingredientId);
  if (ingredientError) {
    return { error: `食材情報の更新に失敗しました: ${ingredientError.message}` };
  }

  const { error } = await supabase.from("game_cards").insert({
    ingredient_id: ingredientId,
    rarity: fields.rarity,
    illustration_url: fields.illustrationUrl || null,
    trivia_kids_text: fields.triviaKidsText || null,
    trivia_adult_text: fields.triviaAdultText || null,
    nutrition_summary: fields.nutritionSummary || null,
  });

  if (error) {
    return { error: `カードの作成に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/game-cards");
  revalidatePath("/game/cards");
  return { error: null };
}

export async function updateGameCard(
  cardId: string,
  ingredientId: string,
  formData: FormData
): Promise<CardFormState> {
  const { supabase } = await requireAdmin();

  const fields = readCardFields(formData);

  if (!isRarity(fields.rarity)) {
    return { error: "レアリティを選択してください" };
  }
  const months = parseMonths(fields.monthsText);
  if (!Array.isArray(months)) {
    return { error: months.error };
  }

  const { error: ingredientError } = await supabase
    .from("ingredients_master")
    .update({ season_months: months, reading: fields.reading || null })
    .eq("id", ingredientId);
  if (ingredientError) {
    return { error: `食材情報の更新に失敗しました: ${ingredientError.message}` };
  }

  const { error } = await supabase
    .from("game_cards")
    .update({
      rarity: fields.rarity,
      illustration_url: fields.illustrationUrl || null,
      trivia_kids_text: fields.triviaKidsText || null,
      trivia_adult_text: fields.triviaAdultText || null,
      nutrition_summary: fields.nutritionSummary || null,
    })
    .eq("id", cardId);

  if (error) {
    return { error: `カードの更新に失敗しました: ${error.message}` };
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
