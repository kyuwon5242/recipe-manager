import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { GameCardVisual } from "@/components/GameCardVisual";
import { categoryIcon, sortByCategoryOrder, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { REVEAL_ALL_CARDS_UNTIL_GACHA, type CardRarity } from "@/lib/game/cards";
import { resolveCardImageSrc } from "@/lib/game/card-image";

export const metadata = { title: "食材図鑑" };

type CardRow = {
  id: string;
  rarity: CardRarity;
  illustration_url: string | null;
  ingredients_master: {
    name: string;
    reading: string | null;
    category: string | null;
    season_months: number[] | null;
  } | null;
};

export default async function GameCardsPage() {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const [{ data: cards, error: cardsError }, { data: owned, error: ownedError }] = await Promise.all([
    supabase
      .from("game_cards")
      .select("id, rarity, illustration_url, ingredients_master(name, reading, category, season_months)")
      .returns<CardRow[]>(),
    supabase.from("family_cards").select("card_id, owned_count").eq("family_id", familyId),
  ]);

  if (cardsError) {
    throw new Error(`カード一覧の取得に失敗しました: ${cardsError.message}`);
  }
  if (ownedError) {
    throw new Error(`所持カードの取得に失敗しました: ${ownedError.message}`);
  }

  const ownedByCardId = new Map((owned ?? []).map((o) => [o.card_id, o.owned_count]));

  const items = (cards ?? []).map((card) => ({
    id: card.id,
    rarity: card.rarity,
    illustrationUrl: card.illustration_url,
    name: card.ingredients_master?.name ?? "(不明な食材)",
    reading: card.ingredients_master?.reading ?? null,
    category: card.ingredients_master?.category ?? UNCATEGORIZED_LABEL,
    seasonMonths: card.ingredients_master?.season_months ?? null,
    ownedCount: ownedByCardId.get(card.id) ?? 0,
  }));

  const grouped = sortByCategoryOrder(items).reduce<Map<string, typeof items>>((map, item) => {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
    return map;
  }, new Map());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="game" />
        <h1 className="text-2xl font-bold">食材図鑑</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        入手済みのカードはイラストで、未入手のカードはシルエットで表示されます。
      </p>

      <div className="mt-6 space-y-8">
        {Array.from(grouped.entries()).map(([category, list]) => (
          <div key={category}>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
              <span aria-hidden="true">{categoryIcon(category)}</span>
              {category}
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {list.map((item) => {
                const isOwned = REVEAL_ALL_CARDS_UNTIL_GACHA || item.ownedCount > 0;
                const src = isOwned ? resolveCardImageSrc(item.illustrationUrl) : null;
                return (
                  <Link key={item.id} href={`/game/cards/${item.id}`} className="block transition hover:-translate-y-0.5">
                    <GameCardVisual
                      category={item.category}
                      rarity={item.rarity}
                      src={src}
                      name={item.name}
                      reading={item.reading}
                      seasonMonths={item.seasonMonths}
                      isOwned={isOwned}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">まだカードが登録されていません。</p>
        ) : null}
      </div>
    </div>
  );
}
