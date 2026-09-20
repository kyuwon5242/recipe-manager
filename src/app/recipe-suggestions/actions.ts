"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { createAnthropicClient } from "@/lib/anthropic/client";
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

export async function suggestRecipes(
  _prevState: RecipeSuggestionState,
  formData: FormData
): Promise<RecipeSuggestionState> {
  const request = String(formData.get("request") ?? "").trim();
  if (!request) {
    return { result: null, error: "食べたいものや気分を入力してください" };
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
    title: r.title,
    category: r.category,
    genre: r.genre,
    ingredients: r.recipe_ingredients
      .map((ri) => ri.ingredients_master?.name)
      .filter((name): name is string => Boolean(name)),
  }));

  const client = createAnthropicClient();

  const systemPrompt = `あなたは家庭の新レシピ提案アシスタントです。本日は${todayInJapanese()}です。
ユーザーの要望(気分・食べたいジャンル・手持ちの食材・季節など、自由な内容)に応じて、あなたが新しいレシピ案を複数考案してください。材料と手順を具体的に書くこと。
参考として登録済みレシピ一覧を渡すので、既に登録されているレシピとほぼ同じ内容の提案は避け、目先を変えた新しい提案をしてください。

季節や旬の食材について聞かれた場合は、日本の一般的な季節感(本日の日付)をもとに判断してください。`;

  const userPrompt = `【ユーザーの要望】\n${request}\n\n【参考: 登録済みレシピ一覧(重複を避けるため)】\n${JSON.stringify(
    recipeSummaries
  )}`;

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(RecipeSuggestionSchema), effort: "medium" },
    });

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
            photo_url: null,
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
