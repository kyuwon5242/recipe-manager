"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { createAnthropicClient } from "@/lib/anthropic/client";

const ExistingSuggestionSchema = z.object({
  recipe_id: z.string(),
  title: z.string(),
  reason: z.string(),
});

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

const MenuSuggestionSchema = z.object({
  from_existing: z.array(ExistingSuggestionSchema),
  new_ideas: z.array(NewIdeaSchema),
});

export type MenuSuggestionResult = {
  from_existing: { recipe_id: string; title: string; reason: string }[];
  new_ideas: {
    title: string;
    reason: string;
    recipe: {
      title: string;
      category: string | null;
      genre: string | null;
      servings: number | null;
      instructions: string | null;
      memo: string | null;
      recipe_url: string | null;
      photo_url: string | null;
    };
    ingredients: { name: string; quantity: string; unit: string }[];
  }[];
};

export type MenuSuggestionState = {
  result: MenuSuggestionResult | null;
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

export async function suggestMenu(
  _prevState: MenuSuggestionState,
  formData: FormData
): Promise<MenuSuggestionState> {
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
ユーザーの要望(気分・食べたいジャンル・手持ちの食材・季節など、自由な内容)に応じて、次の2種類の提案を行ってください。

1. from_existing: 登録済みレシピ一覧の中から、要望に合うものを選ぶ(該当するレシピが無ければ空配列でよい)。recipe_idは必ず与えられた一覧のidをそのまま使うこと。
2. new_ideas: 登録済みレシピに十分マッチするものが無い場合、または要望をより満たせる場合に、あなたが新しいレシピ案を考案する。材料と手順も具体的に書くこと。的外れな場合や登録済みレシピで十分な場合は空配列でよい。

季節や旬の食材について聞かれた場合は、日本の一般的な季節感(本日の日付)をもとに判断してください。`;

  const userPrompt = `【ユーザーの要望】\n${request}\n\n【登録済みレシピ一覧】\n${JSON.stringify(
    recipeSummaries
  )}`;

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(MenuSuggestionSchema), effort: "medium" },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return { result: null, error: "提案の生成に失敗しました" };
    }

    return {
      result: {
        from_existing: parsed.from_existing,
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
