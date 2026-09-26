import { requireAdmin } from "@/lib/admin/current";
import { createClient } from "@/lib/supabase/server";
import { ZoneIcon } from "@/components/ZoneIcon";
import { GameCardCreateForm } from "@/components/GameCardCreateForm";
import { GameCardEditForm, type EditableCard } from "@/components/GameCardEditForm";
import { sortByCategoryOrder, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import type { CardRarity } from "@/lib/game/cards";

export const metadata = { title: "カード管理" };

type IngredientRow = {
  id: string;
  name: string;
  category: string | null;
  season_months: number[] | null;
  reading: string | null;
};
type CardRow = {
  id: string;
  rarity: CardRarity;
  illustration_url: string | null;
  trivia_kids_text: string | null;
  trivia_adult_text: string | null;
  nutrition_summary: string | null;
  ingredients_master: IngredientRow | null;
};

export default async function GameCardsAdminPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [{ data: ingredients, error: ingredientsError }, { data: cards, error: cardsError }] =
    await Promise.all([
      supabase.from("ingredients_master").select("id, name, category, season_months, reading").order("name"),
      supabase
        .from("game_cards")
        .select(
          "id, rarity, illustration_url, trivia_kids_text, trivia_adult_text, nutrition_summary, ingredients_master(id, name, category, season_months, reading)"
        )
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

  const editableCards: EditableCard[] = (cards ?? []).map((card) => ({
    id: card.id,
    ingredientId: card.ingredients_master?.id ?? "",
    name: card.ingredients_master?.name ?? "(食材未設定)",
    category: card.ingredients_master?.category ?? UNCATEGORIZED_LABEL,
    rarity: card.rarity,
    illustrationUrl: card.illustration_url,
    seasonMonths: card.ingredients_master?.season_months ?? null,
    reading: card.ingredients_master?.reading ?? null,
    triviaKidsText: card.trivia_kids_text,
    triviaAdultText: card.trivia_adult_text,
    nutritionSummary: card.nutrition_summary,
  }));
  const sortedCards = sortByCategoryOrder(editableCards);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">カード管理</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        ゲーム要素(食材図鑑)のカードを食材ごとに1枚作成・編集します。旬の月・読み仮名(ひらがな)・レアリティ・イラスト・豆知識をここでまとめて管理します。イラストは<code>public/cards/</code>配下に配置したファイル名を指定してください(未設定の場合はプレースホルダー表示になります)。
      </p>

      <h2 className="mt-6 text-sm font-bold text-gray-700">新しいカードを作成</h2>
      <div className="mt-2">
        <GameCardCreateForm candidates={candidates} />
      </div>

      <h2 className="mt-8 text-sm font-bold text-gray-700">作成済みカード({sortedCards.length}件)</h2>
      <ul className="mt-2 space-y-2">
        {sortedCards.map((card) => (
          <GameCardEditForm key={card.id} card={card} />
        ))}
      </ul>
      {sortedCards.length === 0 ? <p className="mt-2 text-sm text-gray-400">まだカードがありません。</p> : null}
    </div>
  );
}
