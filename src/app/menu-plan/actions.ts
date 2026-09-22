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

const GENRE_ORDER = ["主食", "主菜", "副菜", "汁物"] as const;

const MealPlanSlotSchema = z.object({
  slot: z.string(),
  title: z.string().nullable(),
  reason: z.string(),
  recipe_id: z.string().nullable(),
});

const MealPlanSchema = z.object({
  plan_title: z.string(),
  slots: z.array(MealPlanSlotSchema),
});

export type MealPlanSlotResult =
  | { kind: "existing"; slot: string; title: string; reason: string; recipeId: string }
  | { kind: "unmatched"; slot: string; reason: string };

export type MealPlanResult = {
  planTitle: string;
  slots: MealPlanSlotResult[];
};

export type MealPlanState = {
  result: MealPlanResult | null;
  error: string | null;
};

type RegisteredRecipeRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  is_favorite: boolean;
  created_at: string;
  recipe_ingredients: { ingredients_master: { name: string } | null }[];
};

function todayInJapanese(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function buildSlotLabels(formData: FormData): string[] {
  const labels: string[] = [];
  for (const genre of GENRE_ORDER) {
    const raw = formData.get(`count_${genre}`);
    const count = raw ? Math.max(0, Math.floor(Number(raw))) : 0;
    if (count === 1) {
      labels.push(genre);
    } else if (count > 1) {
      for (let i = 1; i <= count; i++) {
        labels.push(`${genre}${i}`);
      }
    }
  }
  return labels;
}

export async function suggestMealPlan(
  _prevState: MealPlanState,
  formData: FormData
): Promise<MealPlanState> {
  const request = String(formData.get("request") ?? "").trim();
  const slots = buildSlotLabels(formData);

  if (slots.length === 0) {
    return { result: null, error: "含めたい品目を1品以上指定してください" };
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
    .select("id, title, category, genre, servings, is_favorite, created_at, recipe_ingredients(ingredients_master(name))")
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<RegisteredRecipeRow[]>();

  if (error) {
    return { result: null, error: `レシピの取得に失敗しました: ${error.message}` };
  }

  // 入力トークンがレシピ件数に比例して際限なく伸びないよう、品目ごとに
  // 件数の上限まで絞り込む(お気に入り・新しい順に優先)。
  const targetRecipes = selectRecipesForPrompt(recipes ?? []);

  const recipeSummaries = targetRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    genre: r.genre,
    servings: r.servings,
    ingredients: r.recipe_ingredients
      .map((ri) => ri.ingredients_master?.name)
      .filter((name): name is string => Boolean(name)),
  }));

  const client = createAnthropicClient();
  const { menuPlanModel } = await getAiModelSettings(supabase);

  const systemPrompt = `あなたは家庭の献立提案アシスタントです。本日は${todayInJapanese()}です。
ユーザーの条件をもとに、指定された品目(${slots.join(
    "・"
  )})それぞれに1品ずつ、一貫性のある「今日の献立」を1セットだけ提案してください。品目ラベルの先頭(主食/主菜/副菜/汁物)がその品目の種類を表し、同じ種類が複数指定されている場合は連番になっています。出力するslotsの各slotフィールドには、指定された品目ラベルをそのまま1つずつ使ってください。

各品目について、必ず「登録済みレシピ一覧」の中からのみ選んでください(新しいレシピを考案してはいけません)。
- 適したものがあれば、それを選び recipe_id にそのidを、title にそのレシピのタイトルをそのまま指定してください。
- 適したものが一覧の中に無い場合は、recipe_id と title を両方nullにし、reason に「該当する登録済みレシピが見つからなかった理由」を簡潔に書いてください。

品目全体で栄養バランスや味付けの重複(同じ食材・同じ味付けばかりにならない)に配慮し、一貫性のある1セットの献立にしてください。`;

  const userPrompt = `【含めたい品目】${slots.join("、")}\n【条件】${
    request || "(特になし)"
  }\n\n【登録済みレシピ一覧(この中からのみ選ぶこと)】\n${JSON.stringify(recipeSummaries)}`;

  try {
    const stopTimer = startTimer();
    const response = await client.messages.parse({
      model: menuPlanModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(MealPlanSchema), effort: effortForModel(menuPlanModel) },
    });
    const durationMs = stopTimer();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await logAiUsage(supabase, {
      familyId: await getCurrentFamilyId().catch(() => null),
      userId: user?.id ?? null,
      feature: "menu_plan",
      model: menuPlanModel,
      usage: response.usage,
      durationMs,
    });
    await consumeAiQuota(
      supabase,
      estimateCostUsd(menuPlanModel, response.usage.input_tokens, response.usage.output_tokens)
    );
    revalidatePath("/menu-plan");

    const parsed = response.parsed_output;
    if (!parsed) {
      return { result: null, error: "献立の生成に失敗しました" };
    }

    const resultSlots: MealPlanSlotResult[] = parsed.slots.map((s) => {
      if (s.recipe_id && s.title) {
        return {
          kind: "existing",
          slot: s.slot,
          title: s.title,
          reason: s.reason,
          recipeId: s.recipe_id,
        };
      }
      return { kind: "unmatched", slot: s.slot, reason: s.reason };
    });

    return { result: { planTitle: parsed.plan_title, slots: resultSlots }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { result: null, error: `献立の生成に失敗しました: ${message}` };
  }
}
