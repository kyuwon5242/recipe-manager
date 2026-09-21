"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { logAiUsage, startTimer } from "@/lib/ai-usage/log";

const ExtractedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
});

const ExtractedRecipeSchema = z.object({
  is_recipe_page: z.boolean(),
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
      warning: string | null;
      recipe: {
        title: string;
        category: string | null;
        genre: string | null;
        servings: number | null;
        instructions: string | null;
        memo: string | null;
        recipe_url: string | null;
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

// 多くのレシピサイトはSEO用にschema.org/Recipe形式のJSON-LDをページに埋め込んでいる。
// 見つかった場合はテキスト抽出より優先的にモデルへ渡し、精度を上げる。
function extractRecipeJsonLd(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  const isRecipeNode = (node: unknown): boolean => {
    if (!node || typeof node !== "object") return false;
    const type = (node as { ["@type"]?: unknown })["@type"];
    if (typeof type === "string") return type.toLowerCase() === "recipe";
    if (Array.isArray(type)) return type.some((t) => String(t).toLowerCase() === "recipe");
    return false;
  };

  for (const match of blocks) {
    try {
      const json: unknown = JSON.parse(match[1]);
      const candidates: unknown[] = Array.isArray(json) ? json : [json];
      for (const candidate of candidates) {
        if (isRecipeNode(candidate)) {
          return JSON.stringify(candidate).slice(0, 12000);
        }
        const graph = (candidate as { ["@graph"]?: unknown[] })?.["@graph"];
        if (Array.isArray(graph)) {
          const found = graph.find(isRecipeNode);
          if (found) return JSON.stringify(found).slice(0, 12000);
        }
      }
    } catch {
      // 壊れたJSON-LDは無視して次を試す
      continue;
    }
  }

  return null;
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

  const jsonLd = extractRecipeJsonLd(html);
  const pageText = stripHtml(html).slice(0, 15000);
  if (!pageText && !jsonLd) {
    return { ok: false, error: "ページから本文を取得できませんでした" };
  }

  const client = createAnthropicClient();

  const userContent = jsonLd
    ? `以下はレシピページ(${parsed.toString()})に埋め込まれた構造化データ(schema.org/Recipe)です。これを優先的に使ってください。\n\n${jsonLd}\n\n【補足: ページ本文】\n${pageText.slice(0, 4000)}`
    : `以下はレシピページ(${parsed.toString()})の本文です。\n\n${pageText}`;

  let parsedOutput: z.infer<typeof ExtractedRecipeSchema> | null;
  try {
    const stopTimer = startTimer();
    const response = await client.messages.parse({
      // ページ本文からのレシピ抽出も構造化データの読み取りが中心の機械的な
      // タスクであり、フロンティア級のモデルを必要としないため、コストの低い
      // モデルを使う。
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system:
        "あなたはレシピサイトのページからレシピ情報を抽出するアシスタントです。与えられた内容から、レシピ名・カテゴリ(和食/洋食/中華など)・ジャンル(主菜/副菜/汁物など)・何人前か・材料(食材名/数量/単位に分解)・作り方の手順を日本語で抽出してください。読み取れない項目はnullにし、推測で埋めないでください。数量は数値のみをquantityに、単位(個/g/mlなど)はunitに分けてください。is_recipe_pageには、渡された内容が実際にレシピ(材料や作り方を含む)と言えるかどうかをtrue/falseで入れてください。レシピと判断できない、または材料が全く読み取れない場合はis_recipe_pageをfalseにし、ingredientsは空配列にしてください。",
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(ExtractedRecipeSchema) },
    });
    parsedOutput = response.parsed_output;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await logAiUsage(supabase, {
      familyId: await getCurrentFamilyId().catch(() => null),
      userId: user?.id ?? null,
      feature: "recipe_url_extract",
      model: "claude-haiku-4-5-20251001",
      usage: response.usage,
      durationMs: stopTimer(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { ok: false, error: `レシピ情報の解析に失敗しました: ${message}` };
  }

  if (!parsedOutput) {
    return { ok: false, error: "レシピ情報の抽出に失敗しました" };
  }

  let warning: string | null = null;
  if (!parsedOutput.is_recipe_page || parsedOutput.ingredients.length === 0) {
    warning =
      "このページからレシピ情報を十分に読み取れませんでした。内容をご確認のうえ、手動で入力・修正してください。";
  }

  return {
    ok: true,
    warning,
    recipe: {
      title: parsedOutput.title,
      category: parsedOutput.category,
      genre: parsedOutput.genre,
      servings: parsedOutput.servings,
      instructions: parsedOutput.instructions,
      memo: parsedOutput.memo,
      recipe_url: parsed.toString(),
    },
    ingredients: parsedOutput.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
      unit: ingredient.unit ?? "",
    })),
  };
}
