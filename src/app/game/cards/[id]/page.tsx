import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { categoryIcon, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { RARITY_LABELS, RARITY_STYLES, monthsLabel, rarityStars, type CardRarity } from "@/lib/game/cards";
import { resolveCardImageSrc } from "@/lib/game/card-image";

type CardRow = {
  id: string;
  rarity: CardRarity;
  illustration_url: string | null;
  trivia_kids_text: string | null;
  trivia_adult_text: string | null;
  nutrition_summary: string | null;
  ingredients_master: { id: string; name: string; category: string | null; season_months: number[] | null } | null;
};

export default async function GameCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const { data: card, error: cardError } = await supabase
    .from("game_cards")
    .select(
      "id, rarity, illustration_url, trivia_kids_text, trivia_adult_text, nutrition_summary, ingredients_master(id, name, category, season_months)"
    )
    .eq("id", id)
    .maybeSingle<CardRow>();

  if (cardError) {
    throw new Error(`カードの取得に失敗しました: ${cardError.message}`);
  }
  if (!card) {
    notFound();
  }

  const { data: owned, error: ownedError } = await supabase
    .from("family_cards")
    .select("owned_count, first_acquired_by, first_acquired_at")
    .eq("family_id", familyId)
    .eq("card_id", card.id)
    .maybeSingle();

  if (ownedError) {
    throw new Error(`所持状況の取得に失敗しました: ${ownedError.message}`);
  }

  const isOwned = (owned?.owned_count ?? 0) > 0;

  let acquiredByName: string | null = null;
  if (owned?.first_acquired_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", owned.first_acquired_by)
      .maybeSingle();
    acquiredByName = profile?.display_name ?? null;
  }

  const style = RARITY_STYLES[card.rarity];
  const src = isOwned ? resolveCardImageSrc(card.illustration_url) : null;
  const category = card.ingredients_master?.category ?? UNCATEGORIZED_LABEL;

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/game/cards" className="text-sm text-brand-700 hover:underline">
        ← 図鑑一覧に戻る
      </Link>

      <div
        className={`mt-4 rounded-xl border-2 bg-white p-5 shadow-raised ${
          isOwned ? `${style.border} ${style.glow}` : "border-gray-200"
        }`}
      >
        <div
          className={`flex aspect-square w-full items-center justify-center rounded-lg text-5xl ${
            isOwned ? style.imageBg : "bg-gray-100 grayscale brightness-50"
          }`}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={card.ingredients_master?.name ?? ""}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <span aria-hidden="true">{categoryIcon(category)}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <ZoneIcon zone="game" icon={categoryIcon(category)} />
          <h1 className="text-xl font-bold">{isOwned ? card.ingredients_master?.name : "？？？(未入手)"}</h1>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${style.badgeBg} ${style.badgeText}`}>
            {RARITY_LABELS[card.rarity]}
          </span>
          {isOwned ? (
            <span className={`text-sm tracking-wide ${style.badgeText}`}>{rarityStars(card.rarity)}</span>
          ) : null}
        </div>

        {isOwned ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-gray-600">旬: {monthsLabel(card.ingredients_master?.season_months ?? null)}</p>
            {card.trivia_kids_text ? (
              <p className="rounded-md bg-brand-50 px-3 py-2 text-brand-800">{card.trivia_kids_text}</p>
            ) : null}
            {card.trivia_adult_text ? (
              <div>
                <p className="text-xs font-bold text-gray-500">もっと詳しく</p>
                <p className="mt-1 text-gray-700">{card.trivia_adult_text}</p>
              </div>
            ) : null}
            {card.nutrition_summary ? (
              <div>
                <p className="text-xs font-bold text-gray-500">栄養素</p>
                <p className="mt-1 text-gray-700">{card.nutrition_summary}</p>
              </div>
            ) : null}
            {acquiredByName ? (
              <p className="text-xs text-gray-400">
                最初に入手したのは {acquiredByName} さん
                {owned?.first_acquired_at
                  ? `(${new Date(owned.first_acquired_at).toLocaleDateString("ja-JP")})`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            まだ入手していないカードです。ガチャ機能の実装後、入手すると詳細が見られるようになります。
          </p>
        )}
      </div>
    </div>
  );
}
