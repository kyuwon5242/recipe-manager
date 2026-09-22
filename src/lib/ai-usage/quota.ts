import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AiQuotaStatus = {
  isUnlimited: boolean;
  usedUsd: number;
  limitUsd: number;
  remainingUsd: number;
  remainingRatio: number;
  periodStart: string | null;
  nextResetAt: string | null;
};

// マイグレーション未適用時・エラー時は無制限扱いにフォールバックし、既存の挙動を壊さない
// (ai_model_settingsのgetAiModelSettingsと同じ方針)。
const UNLIMITED_STATUS: AiQuotaStatus = {
  isUnlimited: true,
  usedUsd: 0,
  limitUsd: Infinity,
  remainingUsd: Infinity,
  remainingRatio: 1,
  periodStart: null,
  nextResetAt: null,
};

type CheckQuotaRow = {
  used_cost_usd: number;
  limit_usd: number;
  period_start: string;
  is_unlimited: boolean;
};

export async function getAiQuotaStatus(supabase: SupabaseServerClient): Promise<AiQuotaStatus> {
  const { data, error } = await supabase.rpc("check_ai_quota").maybeSingle<CheckQuotaRow>();

  if (error || !data) return UNLIMITED_STATUS;
  if (data.is_unlimited) return UNLIMITED_STATUS;

  const usedUsd = data.used_cost_usd;
  const limitUsd = data.limit_usd;
  const remainingUsd = Math.max(0, limitUsd - usedUsd);
  const remainingRatio = limitUsd > 0 ? Math.max(0, Math.min(1, remainingUsd / limitUsd)) : 1;
  const periodStart = data.period_start;
  const nextResetAt = new Date(
    new Date(periodStart).getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    isUnlimited: false,
    usedUsd,
    limitUsd,
    remainingUsd,
    remainingRatio,
    periodStart,
    nextResetAt,
  };
}

// AI呼び出し後にコストを加算する。記録失敗でAI機能自体を止めたくないため例外を投げない。
export async function consumeAiQuota(supabase: SupabaseServerClient, costUsd: number): Promise<void> {
  try {
    await supabase.rpc("consume_ai_quota", { p_cost: costUsd });
  } catch {
    // 記録失敗は無視する
  }
}
