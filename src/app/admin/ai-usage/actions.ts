"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";

export type UpdateQuotaLimitState = { error: string | null; success: boolean };

export async function updateAiQuotaLimit(
  _prevState: UpdateQuotaLimitState,
  formData: FormData
): Promise<UpdateQuotaLimitState> {
  const { supabase, userId } = await requireAdmin();

  const raw = String(formData.get("weekly_limit_usd") ?? "");
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "0より大きい金額を入力してください", success: false };
  }

  const { error } = await supabase
    .from("ai_quota_settings")
    .update({ weekly_limit_usd: value, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", true);

  if (error) {
    return { error: `保存に失敗しました: ${error.message}`, success: false };
  }

  revalidatePath("/admin/ai-usage");
  return { error: null, success: true };
}

export async function resetUserAiQuota(userId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.rpc("admin_reset_ai_quota", { p_user_id: userId });

  if (error) {
    throw new Error(`リセットに失敗しました: ${error.message}`);
  }

  revalidatePath("/admin/ai-usage");
}
