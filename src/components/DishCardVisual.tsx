import { getCategoryColor } from "@/lib/category-color";

// 料理図鑑カード(一覧・詳細で共通利用)。横長の料理写真を4:3の窓に収める。
// 未達成(isAchieved=false)は写真を出さず鍵アイコンのシルエットにする
// (game-design.md 10章)。タイトル・カテゴリ・ジャンルは、既にレシピ一覧等で
// 見えている情報のため未達成でもそのまま表示する(隠すのは写真のみ)。
// isReady(未達成だが食材カードが100%そろっている)は外枠を光らせて、
// 「今すぐ作れる」対象をひと目で分かるようにする。
export function DishCardVisual({
  title,
  category,
  genre,
  src,
  isAchieved,
  isReady,
}: {
  title: string;
  category: string;
  genre: string;
  src: string | null;
  isAchieved: boolean;
  isReady?: boolean;
}) {
  const color = getCategoryColor(category);
  const highlightReady = !isAchieved && isReady;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white shadow-raised transition ${
        highlightReady
          ? "border-amber-400 ring-2 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.55)]"
          : "border-gray-200"
      }`}
    >
      <div className={`relative aspect-[4/3] ${highlightReady ? "bg-amber-100" : "bg-gray-100"}`}>
        {isAchieved && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : isAchieved ? (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden="true">
            🍽️
          </div>
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center text-3xl ${
              highlightReady ? "text-amber-500" : "bg-gray-300 text-gray-500"
            }`}
            aria-hidden="true"
          >
            {highlightReady ? "✨" : "🔒"}
          </div>
        )}
        {highlightReady ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            作れる!
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate font-semibold">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>{category}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{genre}</span>
        </div>
      </div>
    </div>
  );
}
