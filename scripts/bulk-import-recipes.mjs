// レシピURL一覧からSQLを生成する一括インポートスクリプト。
// 使い方: TARGET_EMAIL=you@example.com node --env-file=.env.local scripts/bulk-import-recipes.mjs
//
// urls.txt (1行1URL) を読み込み、各ページをAIで解析してレシピ情報を抽出し、
// scripts/bulk-recipes.sql に INSERT 文をまとめて出力する。
// 実際のDBへの書き込みはこのスクリプトでは行わない(生成されたSQLはユーザーが
// Supabase SQL Editor で内容を確認のうえ実行する)。
// 読み取りが難しいページはスキップし、bulk-import-log.txt に理由を記録する。

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_EMAIL = process.env.TARGET_EMAIL;
const CONCURRENCY = 4;

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

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRecipeJsonLd(html) {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  const isRecipeNode = (node) => {
    if (!node || typeof node !== "object") return false;
    const type = node["@type"];
    if (typeof type === "string") return type.toLowerCase() === "recipe";
    if (Array.isArray(type)) return type.some((t) => String(t).toLowerCase() === "recipe");
    return false;
  };
  for (const match of blocks) {
    try {
      const json = JSON.parse(match[1]);
      const candidates = Array.isArray(json) ? json : [json];
      for (const candidate of candidates) {
        if (isRecipeNode(candidate)) return JSON.stringify(candidate).slice(0, 12000);
        const graph = candidate?.["@graph"];
        if (Array.isArray(graph)) {
          const found = graph.find(isRecipeNode);
          if (found) return JSON.stringify(found).slice(0, 12000);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function sqlEscape(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeAppBot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function extractRecipe(client, url) {
  const html = await fetchPage(url);
  const jsonLd = extractRecipeJsonLd(html);
  const pageText = stripHtml(html).slice(0, 15000);
  if (!pageText && !jsonLd) {
    return { skip: "ページ本文を取得できませんでした" };
  }

  const userContent = jsonLd
    ? `以下はレシピページ(${url})に埋め込まれた構造化データ(schema.org/Recipe)です。これを優先的に使ってください。\n\n${jsonLd}\n\n【補足: ページ本文】\n${pageText.slice(0, 4000)}`
    : `以下はレシピページ(${url})の本文です。\n\n${pageText}`;

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system:
      "あなたはレシピサイトのページからレシピ情報を抽出するアシスタントです。与えられた内容から、レシピ名・カテゴリ(和食/洋食/中華など)・ジャンル(主菜/副菜/汁物など)・何人前か・材料(食材名/数量/単位に分解)・作り方の手順を日本語で抽出してください。読み取れない項目はnullにし、推測で埋めないでください。数量は数値のみをquantityに、単位(個/g/mlなど)はunitに分けてください。is_recipe_pageには、渡された内容が実際にレシピ(材料や作り方を含む)と言えるかどうかをtrue/falseで入れてください。レシピと判断できない、または材料が全く読み取れない場合はis_recipe_pageをfalseにし、ingredientsは空配列にしてください。",
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(ExtractedRecipeSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) return { skip: "解析結果が取得できませんでした" };
  if (!parsed.is_recipe_page || parsed.ingredients.length === 0) {
    return { skip: "レシピページと判定できない、または材料が読み取れませんでした" };
  }
  return { recipe: parsed };
}

function buildSqlBlock(url, recipe) {
  const lines = [];
  lines.push("do $$");
  lines.push("declare");
  lines.push("  v_recipe_id uuid;");
  lines.push("  v_ingredient_id uuid;");
  lines.push(
    `  v_user_id uuid := (select id from public.profiles where email = ${sqlEscape(
      TARGET_EMAIL
    )});`
  );
  lines.push(
    "  v_family_id uuid := (select fm.family_id from public.family_members fm where fm.user_id = v_user_id limit 1);"
  );
  lines.push("begin");
  lines.push("  insert into public.recipes");
  lines.push(
    "    (title, category, genre, servings, instructions, memo, recipe_url, family_id, created_by, updated_by)"
  );
  lines.push("  values");
  lines.push(
    `    (${sqlEscape(recipe.title)}, ${sqlEscape(recipe.category)}, ${sqlEscape(
      recipe.genre
    )}, ${sqlEscape(recipe.servings)}, ${sqlEscape(recipe.instructions)}, ${sqlEscape(
      recipe.memo
    )}, ${sqlEscape(url)}, v_family_id, v_user_id, v_user_id)`
  );
  lines.push("  returning id into v_recipe_id;");

  for (const ingredient of recipe.ingredients) {
    if (!ingredient.name?.trim()) continue;
    lines.push("");
    lines.push(
      `  insert into public.ingredients_master (name) values (${sqlEscape(
        ingredient.name
      )}) on conflict (name) do nothing;`
    );
    lines.push(
      `  select id into v_ingredient_id from public.ingredients_master where name = ${sqlEscape(
        ingredient.name
      )};`
    );
    lines.push(
      `  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values (v_recipe_id, v_ingredient_id, ${sqlEscape(
        ingredient.quantity
      )}, ${sqlEscape(ingredient.unit)});`
    );
  }

  lines.push("end $$;");
  return lines.join("\n");
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function runNext() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: limit }, runNext));
  return results;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY が設定されていません。--env-file=.env.local を指定してください。");
    process.exit(1);
  }
  if (!TARGET_EMAIL) {
    console.error("環境変数 TARGET_EMAIL に登録先アカウントのメールアドレスを指定してください。");
    process.exit(1);
  }

  const urls = readFileSync(join(__dirname, "urls.txt"), "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  console.log(`${urls.length}件のURLを処理します...`);

  const client = new Anthropic();
  const logLines = [];
  const sqlBlocks = [];
  let successCount = 0;
  let skipCount = 0;

  await mapWithConcurrency(urls, CONCURRENCY, async (url, i) => {
    try {
      const result = await extractRecipe(client, url);
      if (result.skip) {
        skipCount++;
        logLines.push(`[SKIP] ${url} - ${result.skip}`);
        console.log(`[${i + 1}/${urls.length}] SKIP: ${url} (${result.skip})`);
        return;
      }
      sqlBlocks.push(buildSqlBlock(url, result.recipe));
      successCount++;
      logLines.push(`[OK]   ${url} - "${result.recipe.title}"`);
      console.log(`[${i + 1}/${urls.length}] OK: ${url} -> ${result.recipe.title}`);
    } catch (err) {
      skipCount++;
      const message = err instanceof Error ? err.message : String(err);
      logLines.push(`[ERROR] ${url} - ${message}`);
      console.log(`[${i + 1}/${urls.length}] ERROR: ${url} (${message})`);
    }
  });

  const sqlContent = [
    "-- 一括インポートSQL(bulk-import-recipes.mjs により自動生成)",
    `-- 対象アカウント: ${TARGET_EMAIL}`,
    "",
    ...sqlBlocks,
    "",
  ].join("\n\n");

  writeFileSync(join(__dirname, "bulk-recipes.sql"), sqlContent, "utf-8");
  writeFileSync(join(__dirname, "bulk-import-log.txt"), logLines.join("\n"), "utf-8");

  console.log(`\n完了: 成功 ${successCount}件 / スキップ ${skipCount}件`);
  console.log("SQL: scripts/bulk-recipes.sql");
  console.log("ログ: scripts/bulk-import-log.txt");
}

main();
