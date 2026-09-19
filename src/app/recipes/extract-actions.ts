"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient } from "@/lib/anthropic/client";

const ExtractedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
});

const ExtractedRecipeSchema = z.object({
  title: z.string(),
  category: z.string().nullable(),
  genre: z.string().nullable(),
  servings: z.number().nullable(),
  instructions: z.string().nullable(),
  memo: z.string().nullable(),
  ingredients: z.array(ExtractedIngredientSchema),
});

export type ExtractRecipeResult =
  | {
      ok: true;
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
    }
  | { ok: false; error: string };

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(lower)) return true;
  if (lower.endsWith(".local")) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lower)) return true;
  return false;
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractRecipeResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "URLの形式が正しくありません" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "http または https のURLを指定してください" };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: "このURLは指定できません" };
  }

  let html: string;
  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeAppBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { ok: false, error: `ページの取得に失敗しました(status: ${res.status})` };
    }
    html = await res.text();
  } catch {
    return { ok: false, error: "ページの取得に失敗しました。URLを確認してください" };
  }

  const pageText = stripHtml(html).slice(0, 15000);
  if (!pageText) {
    return { ok: false, error: "ページから本文を取得できませんでした" };
  }

  const client = createAnthropicClient();

  let parsedOutput: z.infer<typeof ExtractedRecipeSchema> | null;
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      system:
        "あなたはレシピサイトのページからレシピ情報を抽出するアシスタントです。与えられたページ本文から、レシピ名・カテゴリ(和食/洋食/中華など)・ジャンル(主菜/副菜/汁物など)・何人前か・材料(食材名/数量/単位に分解)・作り方の手順を日本語で抽出してください。読み取れない項目はnullにし、推測で埋めないでください。数量は数値のみをquantityに、単位(個/g/mlなど)はunitに分けてください。",
      messages: [
        {
          role: "user",
          content: `以下はレシピページ(${parsed.toString()})の本文です。\n\n${pageText}`,
        },
      ],
      output_config: { format: zodOutputFormat(ExtractedRecipeSchema) },
    });
    parsedOutput = response.parsed_output;
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { ok: false, error: `レシピ情報の解析に失敗しました: ${message}` };
  }

  if (!parsedOutput) {
    return { ok: false, error: "レシピ情報の抽出に失敗しました" };
  }

  return {
    ok: true,
    recipe: {
      title: parsedOutput.title,
      category: parsedOutput.category,
      genre: parsedOutput.genre,
      servings: parsedOutput.servings,
      instructions: parsedOutput.instructions,
      memo: parsedOutput.memo,
      recipe_url: parsed.toString(),
      photo_url: null,
    },
    ingredients: parsedOutput.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
      unit: ingredient.unit ?? "",
    })),
  };
}
