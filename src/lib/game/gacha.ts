import type { SupabaseClient } from "@supabase/supabase-js";

// ガチャの回数状況(DBの get_gacha_status() の戻り値)。
// 基本回数・日付リセット(日本時間)の判定はすべてDB側で行い、ここでは値を受け取るだけ。
export type GachaStatus = {
  baseDraws: number;
  bonusDraws: number;
  usedDraws: number;
  remainingDraws: number;
};

type GachaStatusRow = {
  base_draws: number;
  bonus_draws: number;
  used_draws: number;
  remaining_draws: number;
};

export async function getGachaStatus(supabase: SupabaseClient, familyId: string): Promise<GachaStatus> {
  const { data, error } = await supabase
    .rpc("get_gacha_status", { p_family_id: familyId })
    .maybeSingle<GachaStatusRow>();

  if (error || !data) {
    throw new Error(`ガチャの回数の取得に失敗しました: ${error?.message ?? "データがありません"}`);
  }

  return {
    baseDraws: data.base_draws,
    bonusDraws: data.bonus_draws,
    usedDraws: data.used_draws,
    remainingDraws: data.remaining_draws,
  };
}
