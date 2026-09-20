import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { INGREDIENT_CATEGORIES } from "@/lib/ingredients/categories";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const ResolutionSchema = z.object({
  resolutions: z.array(
    z.object({
      raw_name: z.string(),
      canonical_name: z.string(),
      category: z.string().nullable(),
    })
  ),
});

/**
 * 食材名の表記ゆれ(商品名・銘柄違いなど)をAIで吸収し、ingredients_masterの
 * 該当行のidに解決する。既存マスタと完全一致する名前はAI呼び出しをスキップする。
 */
export async function resolveIngredientIds(
  supabase: SupabaseServerClient,
  rawNames: string[]
): Promise<Map<string, string>> {
  const uniqueRawNames = Array.from(new Set(rawNames.map((n) => n.trim()).filter(Boolean)));
  const result = new Map<string, string>();
  if (uniqueRawNames.length === 0) return result;

  const { data: existing, error } = await supabase
    .from("ingredients_master")
    .select("id, name, category");

  if (error) {
    throw new Error(`食材マスタの取得に失敗しました: ${error.message}`);
  }

  const byExactName = new Map<string, { id: string; category: string | null }>();
  for (const row of existing ?? []) {
    byExactName.set(row.name.trim(), { id: row.id, category: row.category });
  }

  const unmatched: string[] = [];
  for (const rawName of uniqueRawNames) {
    const exact = byExactName.get(rawName);
    if (exact) {
      result.set(rawName, exact.id);
    } else {
      unmatched.push(rawName);
    }
  }

  if (unmatched.length === 0) {
    return result;
  }

  let resolutions: z.infer<typeof ResolutionSchema>["resolutions"] = [];
  try {
    const client = createAnthropicClient();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      system:
        `あなたは料理の食材名を正規化するアシスタントです。新しく登場した食材名(raw_name)ごとに、それが既存の食材マスタ一覧の中の何かと同じ食材であれば、その既存の名前をcanonical_nameにそのまま使ってください(商品名・銘柄・パッケージ表記などの違いを吸収する。例:「マンジョウ米麹こだわり仕込み本みりん」は既存に「みりん」があればそれに統一する)。既存に該当が無ければ、一般的でシンプルな食材名をcanonical_nameとして提案してください(例:「濃口醤油 大瓶」→「醤油」)。categoryには、${INGREDIENT_CATEGORIES.join("/")} のうち、スーパーの売り場として最も適切なものを入れてください(例:小麦粉・パン粉・片栗粉・乾物・缶詰は「粉類・乾物・缶詰」、豆腐・油揚げ・納豆は「豆腐・大豆製品」、米・パン・麺類は「米・パン・麺」)。`,
      messages: [
        {
          role: "user",
          content: `【既存の食材マスタ一覧】\n${JSON.stringify(
            Array.from(byExactName.keys())
          )}\n\n【新しく解決したい食材名】\n${JSON.stringify(unmatched)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ResolutionSchema), effort: "low" },
    });
    resolutions = response.parsed_output?.resolutions ?? [];
  } catch {
    resolutions = [];
  }

  const resolutionByRaw = new Map(resolutions.map((r) => [r.raw_name, r]));

  for (const rawName of unmatched) {
    const resolution = resolutionByRaw.get(rawName);
    const canonicalName = resolution?.canonical_name?.trim() || rawName;
    const category = resolution?.category ?? null;

    const alreadyKnown = byExactName.get(canonicalName);
    if (alreadyKnown) {
      result.set(rawName, alreadyKnown.id);
      continue;
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("ingredients_master")
      .upsert({ name: canonicalName, category }, { onConflict: "name" })
      .select("id, category")
      .single();

    if (upsertError) {
      throw new Error(`食材マスタの登録に失敗しました: ${upsertError.message}`);
    }

    byExactName.set(canonicalName, { id: upserted.id, category: upserted.category });
    result.set(rawName, upserted.id);
  }

  return result;
}
