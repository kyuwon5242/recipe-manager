"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAiFeatureAccess } from "@/lib/admin/current";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { getCurrentFamilyId } from "@/lib/family/current";
import { logAiUsage, startTimer } from "@/lib/ai-usage/log";
import { getAiModelSettings, effortForModel } from "@/lib/ai-usage/model-settings";
import { getAiQuotaStatus, consumeAiQuota } from "@/lib/ai-usage/quota";
import { estimateCostUsd } from "@/lib/ai-usage/pricing";
import { selectRecipesForPrompt } from "@/lib/recipes/prompt-context";
import type { NewRecipeIdea } from "@/types/recipe-suggestion";

const NewIdeaIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
});

const NewIdeaSchema = z.object({
  title: z.string(),
  reason: z.string(),
  category: z.string().nullable(),
  genre: z.string().nullable(),
  servings: z.number().nullable(),
  instructions: z.string().nullable(),
  ingredients: z.array(NewIdeaIngredientSchema),
});

const RecipeSuggestionSchema = z.object({
  new_ideas: z.array(NewIdeaSchema),
});

export type RecipeSuggestionResult = {
  new_ideas: NewRecipeIdea[];
};

export type RecipeSuggestionState = {
  result: RecipeSuggestionResult | null;
  error: string | null;
};

type RegisteredRecipeRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  is_favorite: boolean;
  created_at: string;
};

function todayInJapanese(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export async function suggestRecipes(
  _prevState: RecipeSuggestionState,
  formData: FormData
): Promise<RecipeSuggestionState> {
  const request = String(formData.get("request") ?? "").trim();
  if (!request) {
    return { result: null, error: "食べたいものや気分を入力してください" };
  }

  try {
    await requireAiFeatureAccess();
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : "この機能の利用には管理者の許可が必要です",
    };
  }

  const supabase = await createClient();

  const quota = await getAiQuotaStatus(supabase);
  if (quota.remainingUsd <= 0) {
    return {
      result: null,
      error: "今週のAI利用上限に達しました。管理者にご連絡いただくか、リセットまでお待ちください。",
    };
  }

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, category, genre, is_favorite, created_at")
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<RegisteredRecipeRow[]>();

  if (error) {
    return { result: null, error: `レシピの取得に失敗しました: ${error.message}` };
  }

  // 重複回避の判定にはタイトル・カテゴリ・ジャンルで十分なため、食材一覧は
  // 送らない(1件あたりのトークン消費を抑える)。件数上限も併せて適用する。
  const targetRecipes = selectRecipesForPrompt(recipes ?? []);
  const recipeSummaries = targetRecipes.map((r) => ({
    title: r.title,
    category: r.category,
    genre: r.genre,
  }));

  const client = createAnthropicClient();
  const { recipeSuggestionModel } = await getAiModelSettings(supabase);

  const systemPrompt = `あなたは家庭の新レシピ提案アシスタントです。本日は${todayInJapanese()}です。
ユーザーの要望(気分・食べたいジャンル・手持ちの食材・季節など、自由な内容)に応じて、あなたが新しいレシピ案を複数考案してください。材料と手順を具体的に書くこと。
参考として登録済みレシピ一覧を渡すので、既に登録されているレシピとほぼ同じ内容の提案は避け、目先を変えた新しい提案をしてください。

季節や旬の食材について聞かれた場合は、日本の一般的な季節感(本日の日付)をもとに判断してください。`;

  const userPrompt = `【ユーザーの要望】\n${request}\n\n【参考: 登録済みレシピ一覧(重複を避けるため。タイトルとジャンルのみ)】\n${JSON.stringify(
    recipeSummaries
  )}`;

  try {
    const stopTimer = startTimer();
    const response = await client.messages.parse({
      model: recipeSuggestionModel,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: zodOutputFormat(RecipeSuggestionSchema),
        effort: effortForModel(recipeSuggestionModel),
      },
    });
    const durationMs = stopTimer();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await logAiUsage(supabase, {
      familyId: await getCurrentFamilyId().catch(() => null),
      userId: user?.id ?? null,
      feature: "recipe_suggestion",
      model: recipeSuggestionModel,
      usage: response.usage,
      durationMs,
    });
    await consumeAiQuota(
      supabase,
      estimateCostUsd(recipeSuggestionModel, response.usage.input_tokens, response.usage.output_tokens)
    );
    revalidatePath("/recipe-suggestions");

    const parsed = response.parsed_output;
    if (!parsed) {
      return { result: null, error: "提案の生成に失敗しました" };
    }

    return {
      result: {
        new_ideas: parsed.new_ideas.map((idea) => ({
          title: idea.title,
          reason: idea.reason,
          recipe: {
            title: idea.title,
            category: idea.category,
            genre: idea.genre,
            servings: idea.servings,
            instructions: idea.instructions,
            memo: null,
            recipe_url: null,
          },
          ingredients: idea.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
            unit: ingredient.unit ?? "",
          })),
        })),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { result: null, error: `提案の生成に失敗しました: ${message}` };
  }
}
