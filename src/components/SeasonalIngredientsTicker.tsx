import Link from "next/link";
import { GameCardVisual } from "@/components/GameCardVisual";
import type { CardRarity } from "@/lib/game/cards";

export type SeasonalCardItem = {
  id: string;
  rarity: CardRarity;
  src: string | null;
  name: string;
  reading: string | null;
  category: string;
  seasonMonths: number[] | null;
  isOwned: boolean;
};

// 今が旬の食材カードを横に流れるように表示する(食材図鑑と同じカード見た目を
// 再利用)。未入手のものもシルエットで含める(図鑑を育てたくなるきっかけ作り)。
// 一覧の最後に同じ内容をもう一度並べてループさせ、継ぎ目が見えないようにする。
export function SeasonalIngredientsTicker({ items }: { items: SeasonalCardItem[] }) {
  if (items.length === 0) return null;
  const looped = [...items, ...items];
  const durationSec = Math.max(items.length * 3, 16);

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-white p-4 shadow-raised">
      <p className="font-bold">🌸 今が旬の食材</p>
      <p className="mt-1 text-xs text-gray-500">
        未入手の食材もシルエットで表示されます。タップすると図鑑で詳細を確認できます。
      </p>
      <div className="group mt-3 -mx-4 overflow-hidden">
        <div
          className="flex w-max gap-3 px-4 group-hover:[animation-play-state:paused]"
          style={{ animation: `seasonal-ticker ${durationSec}s linear infinite` }}
        >
          {looped.map((item, i) => (
            <Link
              key={`${item.id}-${i}`}
              href={`/game/cards/${item.id}`}
              aria-hidden={i >= items.length ? "true" : undefined}
              tabIndex={i >= items.length ? -1 : undefined}
              className="w-28 shrink-0 transition hover:-translate-y-0.5"
            >
              <GameCardVisual
                category={item.category}
                rarity={item.rarity}
                src={item.src}
                name={item.name}
                reading={item.reading}
                seasonMonths={item.seasonMonths}
                isOwned={item.isOwned}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
