import { requireAdmin } from "@/lib/admin/current";
import { createClient } from "@/lib/supabase/server";
import { ZoneIcon } from "@/components/ZoneIcon";
import { GameCardCreateForm } from "@/components/GameCardCreateForm";
import { GameCardDeleteButton } from "@/components/GameCardDeleteButton";
import { RARITY_LABELS, RARITY_STYLES, monthsLabel, type CardRarity } from "@/lib/game/cards";

export const metadata = { title: "カード管理" };

type IngredientRow = { id: string; name: string; season_months: number[] | null };
type CardRow = {
  id: string;
  rarity: CardRarity;
  illustration_url: string | null;
  ingredients_master: IngredientRow | null;
};

export default async function GameCardsAdminPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [{ data: ingredients, error: ingredientsError }, { data: cards, error: cardsError }] =
    await Promise.all([
      supabase.from("ingredients_master").select("id, name, season_months").order("name"),
      supabase
        .from("game_cards")
        .select("id, rarity, illustration_url, ingredients_master(id, name, season_months)")
        .order("created_at", { ascending: false })
        .returns<CardRow[]>(),
    ]);

  if (ingredientsError) {
    throw new Error(`食材マスタの取得に失敗しました: ${ingredientsError.message}`);
  }
  if (cardsError) {
    throw new Error(`カード一覧の取得に失敗しました: ${cardsError.message}`);
  }

  const existingIngredientIds = new Set((cards ?? []).map((c) => c.ingredients_master?.id));
  const candidates = (ingredients ?? []).filter((i) => !existingIngredientIds.has(i.id));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">カード管理</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        ゲーム要素(食材図鑑)のカードを食材ごとに1枚作成します。イラストは<code>public/cards/</code>配下に配置したファイル名を指定してください(未設定の場合はプレースホルダー表示になります)。
      </p>

      <h2 className="mt-6 text-sm font-bold text-gray-700">新しいカードを作成</h2>
      <div className="mt-2">
        <GameCardCreateForm candidates={candidates} />
      </div>

      <h2 className="mt-8 text-sm font-bold text-gray-700">作成済みカード({(cards ?? []).length}件)</h2>
      <ul className="mt-2 space-y-2">
        {(cards ?? []).map((card) => {
          const style = RARITY_STYLES[card.rarity];
          return (
            <li
              key={card.id}
              className={`rounded-lg border-2 bg-white p-3 ${style.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{card.ingredients_master?.name ?? "(食材未設定)"}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className={`rounded-full px-2 py-0.5 ${style.badgeBg} ${style.badgeText}`}>
                      {RARITY_LABELS[card.rarity]}
                    </span>
                    <span>旬: {monthsLabel(card.ingredients_master?.season_months ?? null)}</span>
                  </p>
                </div>
                <GameCardDeleteButton cardId={card.id} />
              </div>
            </li>
          );
        })}
      </ul>
      {(cards ?? []).length === 0 ? <p className="mt-2 text-sm text-gray-400">まだカードがありません。</p> : null}
    </div>
  );
}
