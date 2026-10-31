import { getFamilyRankStatus, MAX_DISH_COUNT } from "@/lib/game/rank";

// 家族ランク表示(アイコン・現在ランク・次のランクまでのゲージ)。
// /game ハブで利用する。
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
      <div className="mt-1 flex items-center gap-2">
        <span className="text-3xl" aria-hidden="true">
          {status.rank.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{status.rank.label}</p>
          <p className="text-sm text-gray-500">
            達成 {status.achievedCount} <span className="text-gray-400">/ {MAX_DISH_COUNT}種</span>
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="relative h-2.5 w-full">
          <div className="h-full w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* 現在の達成状況を表す点に、フライパンで炒めているアニメーションを置く */}
          <span
            aria-hidden="true"
            className="rank-gauge-pan pointer-events-none absolute top-1/2 text-base"
            style={{ left: `${Math.min(96, Math.max(4, progress))}%` }}
          >
            🍳
          </span>
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
