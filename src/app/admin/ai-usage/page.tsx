import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { AI_FEATURE_LABELS, type AiFeature } from "@/lib/ai-usage/log";
import { estimateCostUsd } from "@/lib/ai-usage/pricing";

export const metadata = { title: "AI利用量" };

const LOG_LIMIT = 5000;

type LogRow = {
  feature: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  user_id: string | null;
  profiles: { display_name: string | null; email: string | null } | null;
  families: { name: string } | null;
};

type FeatureBreakdown = {
  feature: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
};

type UserSummary = {
  userId: string;
  name: string;
  familyName: string | null;
  totalCount: number;
  totalInput: number;
  totalOutput: number;
  totalCost: number;
  byFeature: Map<string, FeatureBreakdown>;
};

export default async function AiUsagePage() {
  const { supabase } = await requireAdmin();

  const { data: logs, error } = await supabase
    .from("ai_usage_logs")
    .select(
      "feature, model, input_tokens, output_tokens, user_id, profiles(display_name, email), families(name)"
    )
    .order("created_at", { ascending: false })
    .limit(LOG_LIMIT)
    .returns<LogRow[]>();

  if (error) {
    throw new Error(`利用ログの取得に失敗しました: ${error.message}`);
  }

  const rows = logs ?? [];

  const totalInput = rows.reduce((sum, r) => sum + r.input_tokens, 0);
  const totalOutput = rows.reduce((sum, r) => sum + r.output_tokens, 0);
  const totalCost = rows.reduce(
    (sum, r) => sum + estimateCostUsd(r.model, r.input_tokens, r.output_tokens),
    0
  );

  const byUser = new Map<string, UserSummary>();
  for (const row of rows) {
    const key = row.user_id ?? "unknown";
    if (!byUser.has(key)) {
      byUser.set(key, {
        userId: key,
        name: row.profiles?.display_name ?? row.profiles?.email ?? "(不明なユーザー)",
        familyName: row.families?.name ?? null,
        totalCount: 0,
        totalInput: 0,
        totalOutput: 0,
        totalCost: 0,
        byFeature: new Map(),
      });
    }
    const u = byUser.get(key)!;
    const cost = estimateCostUsd(row.model, row.input_tokens, row.output_tokens);
    u.totalCount += 1;
    u.totalInput += row.input_tokens;
    u.totalOutput += row.output_tokens;
    u.totalCost += cost;

    if (!u.byFeature.has(row.feature)) {
      u.byFeature.set(row.feature, { feature: row.feature, count: 0, inputTokens: 0, outputTokens: 0, cost: 0 });
    }
    const f = u.byFeature.get(row.feature)!;
    f.count += 1;
    f.inputTokens += row.input_tokens;
    f.outputTokens += row.output_tokens;
    f.cost += cost;
  }

  const userSummaries = Array.from(byUser.values()).sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">AI利用量</h1>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        記録件数: {rows.length.toLocaleString()}件{rows.length >= LOG_LIMIT ? `(直近${LOG_LIMIT.toLocaleString()}件まで)` : ""}
        ・コストは概算($、キャッシュ割引等は未考慮)
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">概算コスト合計</p>
          <p className="mt-1 text-lg font-bold">${totalCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">入力トークン合計</p>
          <p className="mt-1 text-lg font-bold">{totalInput.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">出力トークン合計</p>
          <p className="mt-1 text-lg font-bold">{totalOutput.toLocaleString()}</p>
        </div>
      </div>

      <h2 className="mt-6 font-semibold">ユーザー別内訳(コストの高い順)</h2>
      <div className="mt-2 space-y-3">
        {userSummaries.length === 0 ? (
          <p className="text-sm text-gray-400">まだ記録がありません。</p>
        ) : (
          userSummaries.map((u) => (
            <details key={u.userId} className="rounded-lg border border-gray-200 bg-white p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {u.name}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {u.familyName ?? "所属家族なし"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">${u.totalCost.toFixed(3)}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {u.totalCount}回・入力{u.totalInput.toLocaleString()} / 出力
                  {u.totalOutput.toLocaleString()}トークン
                </p>
              </summary>
              <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                {Array.from(u.byFeature.values())
                  .sort((a, b) => b.cost - a.cost)
                  .map((f) => (
                    <li key={f.feature} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{AI_FEATURE_LABELS[f.feature as AiFeature] ?? f.feature}</span>
                      <span>
                        {f.count}回・${f.cost.toFixed(3)}
                      </span>
                    </li>
                  ))}
              </ul>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
