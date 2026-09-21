import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AiFeature =
  | "recipe_suggestion"
  | "menu_plan"
  | "recipe_url_extract"
  | "ingredient_resolve"
  | "ingredient_cleanup"
  | "menu_agent_gate"
  | "menu_agent_loop";

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  recipe_suggestion: "新レシピ提案",
  menu_plan: "献立提案",
  recipe_url_extract: "レシピURL自動抽出",
  ingredient_resolve: "食材名解決(保存時)",
  ingredient_cleanup: "食材マスタ一括整理",
  menu_agent_gate: "献立エージェント(門番判定)",
  menu_agent_loop: "献立エージェント(本体)",
};

// Anthropicのレスポンスに含まれるusage情報をそのまま渡せる形。
type UsageLike = { input_tokens: number; output_tokens: number };

// 利用ログの記録に失敗しても、AI機能自体を止めたくないため例外を投げない。
export async function logAiUsage(
  supabase: SupabaseServerClient,
  params: {
    familyId: string | null;
    userId: string | null;
    feature: AiFeature;
    model: string;
    usage: UsageLike;
    durationMs?: number;
  }
): Promise<void> {
  if (!params.userId) return;
  try {
    await supabase.from("ai_usage_logs").insert({
      family_id: params.familyId,
      user_id: params.userId,
      feature: params.feature,
      model: params.model,
      input_tokens: params.usage.input_tokens,
      output_tokens: params.usage.output_tokens,
      duration_ms: params.durationMs ?? null,
    });
  } catch {
    // 記録失敗は無視する(利用ログは補助的な情報のため)
  }
}

// AI呼び出しの前後でこれを使うと、durationMsをlogAiUsageにそのまま渡せる。
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
