import { categoryIcon } from "@/lib/ingredients/categories";
import { categoryCardStyle, RARITY_EFFECTS, type CardRarity } from "@/lib/game/cards";

// 食材図鑑カードの見た目(一覧・詳細で共通利用)。
// - 背景色の色相 = カテゴリ(魚介は青、野菜・果物は緑 など)
// - 光彩・シマー・リング = レアリティ(上位ほど強く速く光る)
// 未入手時はカテゴリ・レアリティに関わらずグレーのシルエットで統一する。
export function GameCardVisual({
  category,
  rarity,
  src,
  alt,
  isOwned,
  iconClassName,
}: {
  category: string;
  rarity: CardRarity;
  src: string | null;
  alt: string;
  isOwned: boolean;
  iconClassName?: string;
}) {
  const categoryStyle = categoryCardStyle(category);
  const effect = RARITY_EFFECTS[rarity];

  return (
    <div
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg ${
        isOwned ? `${categoryStyle.bg} ${effect.ring} ${effect.glow}` : "bg-gray-100 grayscale brightness-50"
      } ${isOwned && effect.pulse ? "animate-[card-glow-pulse_1.8s_ease-in-out_infinite]" : ""}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className={iconClassName ?? "text-3xl"}>
          {categoryIcon(category)}
        </span>
      )}
      {isOwned && effect.shimmer ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ animation: `card-shimmer ${effect.shimmerDuration} ease-in-out infinite` }}
        >
          <div className="h-full w-1/4 bg-white/50" />
        </div>
      ) : null}
    </div>
  );
}
