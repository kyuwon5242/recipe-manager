"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { CARD_RARITIES } from "@/lib/game/cards";
import { GACHA_WEIGHT_COLUMNS } from "@/lib/game/gacha-settings";

export type UpdateGachaSettingsState = { error: string | null; success: boolean };

const MAX_WEIGHT = 1000;
const MAX_SEASON_MULTIPLIER = 100;

function parseNumber(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (raw === "" || !Number.isFinite(value)) {
    throw new Error("数値を入力してください");
  }
  return value;
}

export async function updateGachaSettings(
  _prevState: UpdateGachaSettingsState,
  formData: FormData
): Promise<UpdateGachaSettingsState> {
  const { supabase, userId } = await requireAdmin();

  try {
    const update: Record<string, number> = {};
    let total = 0;
    for (const rarity of CARD_RARITIES) {
      const weight = parseNumber(formData, `weight_${rarity}`);
      if (weight < 0 || weight > MAX_WEIGHT) {
        throw new Error(`重みは0〜${MAX_WEIGHT}の範囲で入力してください`);
      }
      total += weight;
      update[GACHA_WEIGHT_COLUMNS[rarity]] = weight;
    }
    if (total <= 0) {
      throw new Error("すべてのレアリティの重みを0にはできません");
    }

    const seasonMultiplier = parseNumber(formData, "season_multiplier");
    if (seasonMultiplier < 1 || seasonMultiplier > MAX_SEASON_MULTIPLIER) {
      throw new Error(`旬の倍率は1〜${MAX_SEASON_MULTIPLIER}の範囲で入力してください(1で旬による優遇なし)`);
    }
    update.season_multiplier = seasonMultiplier;

    const { error } = await supabase
      .from("game_gacha_settings")
      .update({ ...update, updated_at: new Date().toISOString(), updated_by: userId })
      .eq("id", true);

    if (error) {
      return { error: `保存に失敗しました: ${error.message}`, success: false };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "不明なエラー", success: false };
  }

  revalidatePath("/admin/game-gacha");
  return { error: null, success: true };
}
