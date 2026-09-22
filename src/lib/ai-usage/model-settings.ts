import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const AI_MODEL_OPTIONS = ["claude-opus-5", "claude-haiku-4-5-20251001"] as const;
export type AiModel = (typeof AI_MODEL_OPTIONS)[number];

export const AI_MODEL_LABELS: Record<AiModel, string> = {
  "claude-opus-5": "Opus 5(高品質・高コスト)",
  "claude-haiku-4-5-20251001": "Haiku 4.5(簡潔・低コスト)",
};

export type AiModelSettings = {
  menuPlanModel: AiModel;
  recipeSuggestionModel: AiModel;
  menuAgentModel: AiModel;
};

const DEFAULT_SETTINGS: AiModelSettings = {
  menuPlanModel: "claude-opus-5",
  recipeSuggestionModel: "claude-opus-5",
  menuAgentModel: "claude-opus-5",
};

type SettingsRow = {
  menu_plan_model: string;
  recipe_suggestion_model: string;
  menu_agent_model: string;
};

function asModel(value: string): AiModel {
  return (AI_MODEL_OPTIONS as readonly string[]).includes(value) ? (value as AiModel) : "claude-opus-5";
}

// 行が無い場合(マイグレーション未適用時)やエラー時は、既存の挙動を維持する
// ためデフォルト(Opus 5)にフォールバックする。
export async function getAiModelSettings(supabase: SupabaseServerClient): Promise<AiModelSettings> {
  const { data, error } = await supabase
    .from("ai_model_settings")
    .select("menu_plan_model, recipe_suggestion_model, menu_agent_model")
    .eq("id", true)
    .maybeSingle<SettingsRow>();

  if (error || !data) return DEFAULT_SETTINGS;

  return {
    menuPlanModel: asModel(data.menu_plan_model),
    recipeSuggestionModel: asModel(data.recipe_suggestion_model),
    menuAgentModel: asModel(data.menu_agent_model),
  };
}

// Opus 5のみeffortパラメータに対応する(Haiku 4.5は非対応)。
export function effortForModel(model: AiModel): "medium" | undefined {
  return model === "claude-opus-5" ? "medium" : undefined;
}
