"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAnthropicClient } from "@/lib/anthropic/client";

const ClusterSchema = z.object({
  canonical_name: z.string(),
  category: z.string().nullable(),
  member_names: z.array(z.string()),
});

const ClusterResultSchema = z.object({
  clusters: z.array(ClusterSchema),
});

export type CleanupResult = {
  mergedCount: number;
  categorizedCount: number;
  totalBefore: number;
  totalAfter: number;
};

export type CleanupState = {
  result: CleanupResult | null;
  error: string | null;
};

// 1回のAI呼び出しあたりの件数。多すぎるとmax_tokensを増やす必要が出て
// (Anthropic SDKが「ストリーミング必須」と判定してしまう)、少なすぎると
// 別チャンクにまたがる表記ゆれを見逃す。経験的にこの件数で分割する。
const CHUNK_SIZE = 60;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function cleanupIngredients(
  _prevState: CleanupState,
  _formData: FormData
): Promise<CleanupState> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("ingredients_master")
    .select("id, name, category");

  if (error) {
    return { result: null, error: `食材マスタの取得に失敗しました: ${error.message}` };
  }

  const allRows = rows ?? [];
  if (allRows.length === 0) {
    return {
      result: { mergedCount: 0, categorizedCount: 0, totalBefore: 0, totalAfter: 0 },
      error: null,
    };
  }

  const byName = new Map(allRows.map((r) => [r.name, r]));
  const client = createAnthropicClient();
  let mergedCount = 0;
  let categorizedCount = 0;

  for (const nameChunk of chunk(allRows.map((r) => r.name), CHUNK_SIZE)) {
    let clusters: z.infer<typeof ClusterResultSchema>["clusters"] = [];
    try {
      const response = await client.messages.parse({
        model: "claude-opus-5",
        max_tokens: 8000,
        system:
          "あなたは料理の食材名マスタを整理するアシスタントです。与えられた食材名一覧を、実質的に同じ食材を指すものごとにグループ化してください。商品名・銘柄・パッケージサイズなどの違い(例:「マンジョウ米麹こだわり仕込み本みりん」と「みりん」)は同じグループにまとめてください。判断に迷う場合はまとめずに単独のグループとしてください。各グループには、最も一般的でシンプルな名前をcanonical_nameとして選び、member_namesにはそのグループに属する元の名前を全て含めてください(1件だけのグループでも構いません)。categoryには、野菜/肉・魚/調味料/乳製品・卵/主食/その他 のいずれか適切なものを入れてください。すべての入力名が、いずれか1つのグループのmember_namesに過不足なく(重複や漏れなく)含まれるようにしてください。",
        messages: [
          {
            role: "user",
            content: `【食材名一覧】\n${JSON.stringify(nameChunk)}`,
          },
        ],
        output_config: { format: zodOutputFormat(ClusterResultSchema), effort: "low" },
      });
      clusters = response.parsed_output?.clusters ?? [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      return { result: null, error: `AIによる整理に失敗しました: ${message}` };
    }

    for (const cluster of clusters) {
      const memberRows = cluster.member_names
        .map((name) => byName.get(name))
        .filter((r): r is { id: string; name: string; category: string | null } => Boolean(r));

      if (memberRows.length === 0) continue;

      const canonicalRow =
        memberRows.find((r) => r.name === cluster.canonical_name) ?? memberRows[0];

      if (cluster.category && canonicalRow.category !== cluster.category) {
        const { error: updateError } = await supabase
          .from("ingredients_master")
          .update({ category: cluster.category })
          .eq("id", canonicalRow.id);
        if (!updateError) categorizedCount++;
      }

      if (cluster.canonical_name && cluster.canonical_name !== canonicalRow.name) {
        // 名前の重複などで失敗しても致命的ではないため、結果は無視する
        await supabase
          .from("ingredients_master")
          .update({ name: cluster.canonical_name })
          .eq("id", canonicalRow.id);
      }

      for (const member of memberRows) {
        if (member.id === canonicalRow.id) continue;

        // ingredients_masterは家族を跨いだ共有辞書だが、recipe_ingredientsは
        // 家族単位のRLSで保護されている。自分の家族以外がまだ参照している
        // 食材は、付け替え・削除のいずれかが失敗しうる(想定内)。その場合は
        // 全体を止めずスキップして次に進む。
        const { error: reassignError } = await supabase
          .from("recipe_ingredients")
          .update({ ingredient_id: canonicalRow.id })
          .eq("ingredient_id", member.id);

        if (reassignError) continue;

        const { error: deleteError } = await supabase
          .from("ingredients_master")
          .delete()
          .eq("id", member.id);

        if (deleteError) continue;

        mergedCount++;
      }
    }
  }

  revalidatePath("/ingredients");
  revalidatePath("/shopping-list");

  return {
    result: {
      mergedCount,
      categorizedCount,
      totalBefore: allRows.length,
      totalAfter: allRows.length - mergedCount,
    },
    error: null,
  };
}
