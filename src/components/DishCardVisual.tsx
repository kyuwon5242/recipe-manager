import { getCategoryColor } from "@/lib/category-color";

// 料理図鑑カード(一覧・詳細で共通利用)。横長の料理写真を4:3の窓に収める。
// 未達成(isAchieved=false)は写真を出さず鍵アイコンのシルエットにする
// (game-design.md 10章)。タイトル・カテゴリ・ジャンルは、既にレシピ一覧等で
// 見えている情報のため未達成でもそのまま表示する(隠すのは写真のみ)。
export function DishCardVisual({
  title,
  category,
  genre,
  src,
  isAchieved,
}: {
  title: string;
  category: string;
  genre: string;
  src: string | null;
  isAchieved: boolean;
}) {
  const color = getCategoryColor(category);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-raised">
      <div className="relative aspect-[4/3] bg-gray-100">
        {isAchieved && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : isAchieved ? (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden="true">
            🍽️
          </div>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gray-300 text-3xl text-gray-500"
            aria-hidden="true"
          >
            🔒
          </div>
        )}
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
