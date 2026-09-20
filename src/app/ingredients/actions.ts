"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { INGREDIENT_CATEGORIES } from "@/lib/ingredients/categories";

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
  targetCount: number;
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
  // 家族を跨いだ共有辞書全体を書き換える操作のため、管理者のみ実行可能にする
  // (通常のメンテナンスの範囲を超える、コストのかかる一括AI処理のため)。
  const { supabase } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from("ingredients_master")
    .select("id, name, category");

  if (error) {
    return { result: null, error: `食材マスタの取得に失敗しました: ${error.message}` };
  }

  const allRows = rows ?? [];
  if (allRows.length === 0) {
    return {
      result: { mergedCount: 0, categorizedCount: 0, totalBefore: 0, totalAfter: 0, targetCount: 0 },
      error: null,
    };
  }

  // 既にカテゴリが設定済みの行は「参考情報」として扱い、AIへの分類対象には
  // しない。分類対象は未分類(category IS NULL)の行のみに絞ることで、実行の
  // たびに全件をAIへ投げ直すことを避け、トークン消費を利用実態(新規に増えた
  // 食材の量)に比例させる。
  const targets = allRows.filter((r) => r.category === null);
  const reference = allRows.filter((r) => r.category !== null);

  if (targets.length === 0) {
    return {
      result: {
        mergedCount: 0,
        categorizedCount: 0,
        totalBefore: allRows.length,
        totalAfter: allRows.length,
        targetCount: 0,
      },
      error: null,
    };
  }

  const targetByName = new Map(targets.map((r) => [r.name, r]));
  const referenceByName = new Map(reference.map((r) => [r.name, r]));
  const referenceNames = reference.map((r) => r.name);

  const client = createAnthropicClient();
  let mergedCount = 0;
  let categorizedCount = 0;

  for (const nameChunk of chunk(targets.map((r) => r.name), CHUNK_SIZE)) {
    let clusters: z.infer<typeof ClusterResultSchema>["clusters"] = [];
    try {
      const response = await client.messages.parse({
        // 食材名マスタの整理は機械的な分類タスクであり、コストの低いモデルを
        // 使う(全件対象だった頃はフロンティア級モデルのコストが積み上がる
        // 主要因だったため、未分類のみへの絞り込みと合わせて対応する)。
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system:
          `あなたは料理の食材名マスタを整理するアシスタントです。「分類済みの食材一覧」は既に整理済みなので変更しないでください。「未分類の食材一覧」の各名前について、分類済みの食材一覧の中に実質的に同じ食材があれば、その食材と同じグループにまとめ、canonical_nameには分類済み一覧にあるその名前をそのまま使い、categoryにもその食材の既存カテゴリをそのまま使ってください。分類済み一覧に該当が無い場合は、未分類の食材同士で実質的に同じものをグループ化してください(商品名・銘柄・パッケージサイズなどの違いは吸収する。例:「マンジョウ米麹こだわり仕込み本みりん」と「みりん」)。判断に迷う場合はまとめずに単独のグループとしてください。新しいグループのcanonical_nameには最も一般的でシンプルな名前を選び、categoryには${INGREDIENT_CATEGORIES.join("/")} のうち、スーパーの売り場として最も適切なものを入れてください(例:小麦粉・パン粉・片栗粉・乾物・缶詰は「粉類・乾物・缶詰」、豆腐・油揚げ・納豆は「豆腐・大豆製品」、米・パン・麺類は「米・パン・麺」)。member_namesには「未分類の食材一覧」に含まれる名前のみを含めてください(分類済み一覧の名前は含めないでください)。「未分類の食材一覧」の全ての名前が、いずれか1つのグループのmember_namesに過不足なく(重複や漏れなく)含まれるようにしてください。`,
        messages: [
          {
            role: "user",
            content: `【分類済みの食材一覧(参考。変更しないでください)】\n${JSON.stringify(
              referenceNames
            )}\n\n【未分類の食材一覧(分類対象)】\n${JSON.stringify(nameChunk)}`,
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
        .map((name) => targetByName.get(name))
        .filter((r): r is { id: string; name: string; category: string | null } => Boolean(r));

      if (memberRows.length === 0) continue;

      // 既存の分類済み食材と同じものと判定された場合は、その既存行に統合する
      // (分類済み行の名前・カテゴリは変更しない)。
      const referenceMatch = referenceByName.get(cluster.canonical_name);
      if (referenceMatch) {
        for (const member of memberRows) {
          // ingredients_masterは家族を跨いだ共有辞書だが、recipe_ingredientsは
          // 家族単位のRLSで保護されている。自分の家族以外がまだ参照している
          // 食材は、付け替え・削除のいずれかが失敗しうる(想定内)。その場合は
          // 全体を止めずスキップして次に進む。
          const { error: reassignError } = await supabase
            .from("recipe_ingredients")
            .update({ ingredient_id: referenceMatch.id })
            .eq("ingredient_id", member.id);
          if (reassignError) continue;

          const { error: deleteError } = await supabase
            .from("ingredients_master")
            .delete()
            .eq("id", member.id);
          if (deleteError) continue;

          mergedCount++;
        }
        continue;
      }

      // 未分類同士の新しいグループ: 代表行を1件選び、カテゴリを設定したうえで
      // 残りを統合する。
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
      targetCount: targets.length,
    },
    error: null,
  };
}
