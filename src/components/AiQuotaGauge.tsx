import type { AiQuotaStatus } from "@/lib/ai-usage/quota";

function formatResetDate(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).format(new Date(iso));
}

function barColor(ratio: number): string {
  if (ratio <= 0) return "bg-red-500";
  if (ratio < 0.2) return "bg-orange-500";
  return "bg-brand-500";
}

// トップページ・各AI機能画面に表示する、週間AI利用可能残量のゲージ。
// 管理者も含め全ユーザーが上限の対象(管理者は/admin/ai-usageから
// 自分自身を含め復活〈リセット〉できる)。isUnlimitedは、マイグレーション
// 未適用時・取得エラー時のフォールバックでのみtrueになる。
export function AiQuotaGauge({ status }: { status: AiQuotaStatus }) {
  if (status.isUnlimited) {
    return null;
  }

  const percent = Math.round(status.remainingRatio * 100);
  const exhausted = status.remainingUsd <= 0;

  return (
    <div className="mt-2 max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">
          {exhausted ? "今週のAI利用上限に達しました" : `AI利用可能: 残り${percent}%`}
        </span>
        {status.nextResetAt ? (
          <span className="text-gray-400">{formatResetDate(status.nextResetAt)}にリセット</span>
        ) : null}
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor(status.remainingRatio)}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}
