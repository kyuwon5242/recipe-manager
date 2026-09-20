"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { createAnthropicClient } from "@/lib/anthropic/client";
import type { NewRecipeIdea, RecipePrefill } from "@/types/recipe-suggestion";

const GENRE_ORDER = ["主食", "主菜", "副菜", "汁物"] as const;
const DEFAULT_SERVINGS = 2;

const NewRecipeSchema = z.object({
  category: z.string().nullable(),
  genre: z.string().nullable(),
  servings: z.number().nullable(),
  instructions: z.string().nullable(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
    })
  ),
});

const MealPlanSlotSchema = z.object({
  slot: z.string(),
  title: z.string(),
  reason: z.string(),
  recipe_id: z.string().nullable(),
  new_recipe: NewRecipeSchema.nullable(),
});

const MealPlanSchema = z.object({
  plan_title: z.string(),
  slots: z.array(MealPlanSlotSchema),
});

export type MealPlanSlotResult =
  | { kind: "existing"; slot: string; title: string; reason: string; recipeId: string }
  | { kind: "new"; slot: string; idea: NewRecipeIdea };

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

  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, category, genre, servings, recipe_ingredients(ingredients_master(name))")
    .returns<RegisteredRecipeRow[]>();

  if (error) {
    return { result: null, error: `レシピの取得に失敗しました: ${error.message}` };
  }

  const recipeSummaries = (recipes ?? []).map((r) => ({
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

  const systemPrompt = `あなたは家庭の献立提案アシスタントです。本日は${todayInJapanese()}です。
ユーザーの条件をもとに、指定された品目(${slots.join(
    "・"
  )})それぞれに1品ずつ、一貫性のある「今日の献立」を1セットだけ提案してください。品目ラベルの先頭(主食/主菜/副菜/汁物)がその品目の種類を表し、同じ種類が複数指定されている場合は連番になっています。出力するslotsの各slotフィールドには、指定された品目ラベルをそのまま1つずつ使ってください。

各品目について:
- 登録済みレシピ一覧の中に適したものがあれば、それを選び recipe_id にそのidを指定してください(new_recipeはnullにする)。
- 適したものがなければ、あなたが新しいレシピ案を考案してください(recipe_idはnullにし、new_recipeに材料・手順を具体的に記入する)。新しいレシピ案の人数は、一般的な家庭向けの分量(${DEFAULT_SERVINGS}人前程度)を目安にしてください。実際の人数調整は後の工程で行います。

品目全体で栄養バランスや味付けの重複(同じ食材・同じ味付けばかりにならない)に配慮し、一貫性のある1セットの献立にしてください。`;

  const userPrompt = `【含めたい品目】${slots.join("、")}\n【条件】${
    request || "(特になし)"
  }\n\n【登録済みレシピ一覧】\n${JSON.stringify(recipeSummaries)}`;

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(MealPlanSchema), effort: "medium" },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return { result: null, error: "献立の生成に失敗しました" };
    }

    const resultSlots: MealPlanSlotResult[] = parsed.slots.map((s) => {
      if (s.recipe_id) {
        return {
          kind: "existing",
          slot: s.slot,
          title: s.title,
          reason: s.reason,
          recipeId: s.recipe_id,
        };
      }

      const newRecipe = s.new_recipe;
      const recipe: RecipePrefill = {
        title: s.title,
        category: newRecipe?.category ?? null,
        genre: newRecipe?.genre ?? s.slot,
        servings: newRecipe?.servings ?? DEFAULT_SERVINGS,
        instructions: newRecipe?.instructions ?? null,
        memo: null,
        recipe_url: null,
        photo_url: null,
      };

      return {
        kind: "new",
        slot: s.slot,
        idea: {
          title: s.title,
          reason: s.reason,
          recipe,
          ingredients: (newRecipe?.ingredients ?? []).map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
            unit: ingredient.unit ?? "",
          })),
        },
      };
    });

    return { result: { planTitle: parsed.plan_title, slots: resultSlots }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { result: null, error: `献立の生成に失敗しました: ${message}` };
  }
}
