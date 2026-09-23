"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { logAiUsage, startTimer } from "@/lib/ai-usage/log";

const SeasonItemSchema = z.object({
  name: z.string(),
  season_months: z.array(z.number().int().min(1).max(12)),
});

const SeasonResultSchema = z.object({
  items: z.array(SeasonItemSchema),
});

export type GenerateSeasonsResult = {
  assignedCount: number;
  targetCount: number;
};

export type GenerateSeasonsState = {
  result: GenerateSeasonsResult | null;
  error: string | null;
};

// 食材マスタ整理(src/app/ingredients/actions.ts)と同じ理由でチャンク分割する。
const CHUNK_SIZE = 60;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function generateSeasonMonths(
  _prevState: GenerateSeasonsState,
  _formData: FormData
): Promise<GenerateSeasonsState> {
  // 家族を跨いだ共有辞書全体を書き換える一括AI処理のため管理者のみ実行可能にする
  const { supabase, userId } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from("ingredients_master")
    .select("id, name")
    .is("season_months", null);

  if (error) {
    return { result: null, error: `食材マスタの取得に失敗しました: ${error.message}` };
  }

  const targets = rows ?? [];
  if (targets.length === 0) {
    return { result: { assignedCount: 0, targetCount: 0 }, error: null };
  }

  const targetByName = new Map(targets.map((r) => [r.name, r]));
  const client = createAnthropicClient();
  let assignedCount = 0;

  for (const nameChunk of chunk(targets.map((r) => r.name), CHUNK_SIZE)) {
    let items: z.infer<typeof SeasonResultSchema>["items"] = [];
    try {
      const stopTimer = startTimer();
      const response = await client.messages.parse({
        // 旬の月を割り当てる機械的な分類タスクであり、フロンティア級モデルの
        // 推論力を必要としないため、食材マスタ整理と同じくコストの低いモデルを使う。
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system:
          "あなたは日本の家庭料理向け食材の「旬」の月を割り当てるアシスタントです。各食材名について、日本のスーパーで最も多く出回る(美味しい)時期の月を1〜12の整数で挙げてください(複数月可)。調味料・加工食品・通年出回るものなど、明確な旬が無い食材は season_months を空配列 [] にしてください。判断が難しい場合は一般的な目安で構いません。",
        messages: [
          {
            role: "user",
            content: `次の食材名それぞれについて season_months を割り当ててください。\n${JSON.stringify(nameChunk)}`,
          },
        ],
        output_config: { format: zodOutputFormat(SeasonResultSchema) },
      });
      items = response.parsed_output?.items ?? [];
      await logAiUsage(supabase, {
        familyId: null,
        userId,
        feature: "ingredient_season_assign",
        model: "claude-haiku-4-5-20251001",
        usage: response.usage,
        durationMs: stopTimer(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      return { result: null, error: `AIによる旬データ生成に失敗しました: ${message}` };
    }

    // 1件ずつawaitして更新すると件数分の往復が発生し数十〜百秒規模になるため、
    // チャンク単位でまとめてupsertする(Vercelの関数タイムアウト対策も兼ねる)。
    const rowsToUpdate = items
      .map((item) => {
        const target = targetByName.get(item.name);
        return target ? { id: target.id, season_months: item.season_months } : null;
      })
      .filter((row): row is { id: string; season_months: number[] } => row !== null);

    if (rowsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from("ingredients_master")
        .upsert(rowsToUpdate, { onConflict: "id" });
      if (!updateError) assignedCount += rowsToUpdate.length;
    }
  }

  revalidatePath("/admin/seasons");

  return {
    result: { assignedCount, targetCount: targets.length },
    error: null,
  };
}

export type UpdateSeasonState = {
  error: string | null;
};

export async function updateIngredientSeason(
  ingredientId: string,
  monthsText: string
): Promise<UpdateSeasonState> {
  const { supabase } = await requireAdmin();

  const months = monthsText
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s));

  if (months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
    return { error: "月は1〜12の数字をカンマ区切りで入力してください(例: 6,7,8)" };
  }

  const { error } = await supabase
    .from("ingredients_master")
    .update({ season_months: months })
    .eq("id", ingredientId);

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/seasons");
  return { error: null };
}
