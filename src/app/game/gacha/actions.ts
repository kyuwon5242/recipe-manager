"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { resolveCardImageSrc } from "@/lib/game/card-image";
import { UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import type { CardRarity } from "@/lib/game/cards";

export type DrawnCard = {
  id: string;
  rarity: CardRarity;
  src: string | null;
  name: string;
  reading: string | null;
  category: string;
  seasonMonths: number[] | null;
  isNew: boolean;
  totalOwned: number;
  drawnAt: number;
};

export type GachaDrawState = {
  error: string | null;
  card: DrawnCard | null;
  remainingDraws: number | null;
};

type DrawRow = {
  drawn_card_id: string;
  is_new_card: boolean;
  total_owned: number;
  draws_remaining: number;
};

type DrawnCardRow = {
  rarity: CardRarity;
  illustration_url: string | null;
  ingredients_master: {
    name: string;
    reading: string | null;
    category: string | null;
    season_months: number[] | null;
  } | null;
};

export async function drawGacha(): Promise<GachaDrawState> {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const { data: drawn, error } = await supabase
    .rpc("draw_gacha", { p_family_id: familyId })
    .maybeSingle<DrawRow>();

  if (error) {
    if (error.message.includes("gacha_no_draws_left")) {
      revalidatePath("/game/gacha");
      return { error: "今日のガチャはもう引き切りました。また明日引けます。", card: null, remainingDraws: 0 };
    }
    if (error.message.includes("gacha_no_cards")) {
      return { error: "ガチャで引けるカードがまだ登録されていません。", card: null, remainingDraws: null };
    }
    return { error: `ガチャに失敗しました: ${error.message}`, card: null, remainingDraws: null };
  }
  if (!drawn) {
    return { error: "ガチャの結果を取得できませんでした。", card: null, remainingDraws: null };
  }

  const { data: card, error: cardError } = await supabase
    .from("game_cards")
    .select("rarity, illustration_url, ingredients_master(name, reading, category, season_months)")
    .eq("id", drawn.drawn_card_id)
    .single<DrawnCardRow>();

  if (cardError) {
    // 抽選自体は確定しているので、表示用の取得失敗はメッセージで知らせる
    return {
      error: `カードは入手しましたが、表示用の情報を取得できませんでした(図鑑で確認できます): ${cardError.message}`,
      card: null,
      remainingDraws: drawn.draws_remaining,
    };
  }

  revalidatePath("/game");
  revalidatePath("/game/gacha");
  revalidatePath("/game/cards");

  return {
    error: null,
    remainingDraws: drawn.draws_remaining,
    card: {
      id: drawn.drawn_card_id,
      rarity: card.rarity,
      src: resolveCardImageSrc(card.illustration_url),
      name: card.ingredients_master?.name ?? "(不明な食材)",
      reading: card.ingredients_master?.reading ?? null,
      category: card.ingredients_master?.category ?? UNCATEGORIZED_LABEL,
      seasonMonths: card.ingredients_master?.season_months ?? null,
      isNew: drawn.is_new_card,
      totalOwned: drawn.total_owned,
      drawnAt: Date.now(),
    },
  };
}
