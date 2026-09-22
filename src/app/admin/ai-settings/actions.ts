"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { AI_MODEL_OPTIONS, type AiModel } from "@/lib/ai-usage/model-settings";

export type UpdateModelSettingsState = { error: string | null; success: boolean };

function parseModel(formData: FormData, key: string): AiModel {
  const value = String(formData.get(key) ?? "");
  if (!(AI_MODEL_OPTIONS as readonly string[]).includes(value)) {
    throw new Error(`不正なモデル指定です: ${key}`);
  }
  return value as AiModel;
}

export async function updateAiModelSettings(
  _prevState: UpdateModelSettingsState,
  formData: FormData
): Promise<UpdateModelSettingsState> {
  const { supabase, userId } = await requireAdmin();

  try {
    const menuPlanModel = parseModel(formData, "menu_plan_model");
    const recipeSuggestionModel = parseModel(formData, "recipe_suggestion_model");
    const menuAgentModel = parseModel(formData, "menu_agent_model");

    const { error } = await supabase
      .from("ai_model_settings")
      .update({
        menu_plan_model: menuPlanModel,
        recipe_suggestion_model: recipeSuggestionModel,
        menu_agent_model: menuAgentModel,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", true);

    if (error) {
      return { error: `保存に失敗しました: ${error.message}`, success: false };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { error: message, success: false };
  }

  revalidatePath("/admin/ai-settings");
  return { error: null, success: true };
}
