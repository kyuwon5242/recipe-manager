import { getFamilyRankStatus, MAX_DISH_COUNT } from "@/lib/game/rank";

// 家族ランク表示(アイコン・現在ランク・次のランクまでのゲージ)。
// /game ハブ・/game/cook の両方で共通利用する。
export function FamilyRankCard({ achievedCount }: { achievedCount: number }) {
  const status = getFamilyRankStatus(achievedCount);
  const rangeStart = status.rank.min;
  const rangeEnd = status.nextRank ? status.nextRank.min : MAX_DISH_COUNT;
  const span = Math.max(1, rangeEnd - rangeStart);
  const progress = status.nextRank
    ? Math.min(100, Math.max(0, ((status.achievedCount - rangeStart) / span) * 100))
    : 100;

  return (
    <div className="rounded-xl bg-white p-4 shadow-raised">
      <p className="text-sm text-gray-500">家族ランク</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">
          {status.rank.icon}
        </span>
        <div>
          <p className="text-xl font-bold">{status.rank.label}</p>
          <p className="text-sm text-gray-500">
            達成 {status.achievedCount} <span className="text-gray-400">/ {MAX_DISH_COUNT}種</span>
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {status.nextRank
            ? `次の「${status.nextRank.icon} ${status.nextRank.label}」まであと${status.toNextRank}種`
            : "最上位に到達しています"}
        </p>
      </div>
    </div>
  );
}
