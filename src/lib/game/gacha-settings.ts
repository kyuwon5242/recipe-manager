import type { SupabaseClient } from "@supabase/supabase-js";
import { CARD_RARITIES, type CardRarity } from "@/lib/game/cards";

// ガチャの出現確率の設定(DBの game_gacha_settings、アプリ全体で1行)。
// レアリティごとの「重み」で持つ。カードが1枚も無いレアリティは抽選対象外になり、
// 残りのレアリティの重みで按分される(実際の確率は effectiveRarityRates で求める)。
export type GachaSettings = {
  weights: Record<CardRarity, number>;
  seasonMultiplier: number;
};

type GachaSettingsRow = {
  weight_normal: number;
  weight_rare: number;
  weight_super_rare: number;
  weight_legendary: number;
  season_multiplier: number;
};

export const GACHA_WEIGHT_COLUMNS: Record<CardRarity, string> = {
  normal: "weight_normal",
  rare: "weight_rare",
  super_rare: "weight_super_rare",
  legendary: "weight_legendary",
};

export async function getGachaSettings(supabase: SupabaseClient): Promise<GachaSettings> {
  const { data, error } = await supabase
    .from("game_gacha_settings")
    .select("weight_normal, weight_rare, weight_super_rare, weight_legendary, season_multiplier")
    .eq("id", true)
    .maybeSingle<GachaSettingsRow>();

  if (error || !data) {
    throw new Error(`ガチャ設定の取得に失敗しました: ${error?.message ?? "データがありません"}`);
  }

  return {
    weights: {
      normal: Number(data.weight_normal),
      rare: Number(data.weight_rare),
      super_rare: Number(data.weight_super_rare),
      legendary: Number(data.weight_legendary),
    },
    seasonMultiplier: Number(data.season_multiplier),
  };
}

// 重みと現在のカード枚数から、実際のレアリティ別出現率(0〜1)を求める。
// 抽選対象外(枚数0・重み0)のレアリティは0。
export function effectiveRarityRates(
  weights: Record<CardRarity, number>,
  cardCounts: Record<CardRarity, number>
): Record<CardRarity, number> {
  const active = CARD_RARITIES.filter((r) => cardCounts[r] > 0 && weights[r] > 0);
  const total = active.reduce((sum, r) => sum + weights[r], 0);
  return Object.fromEntries(
    CARD_RARITIES.map((r) => [r, active.includes(r) && total > 0 ? weights[r] / total : 0])
  ) as Record<CardRarity, number>;
}
