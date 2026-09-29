import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { MakeDishButton } from "@/components/MakeDishButton";
import { getCategoryColor } from "@/lib/category-color";
import { getFamilyRankStatus, MAX_DISH_COUNT } from "@/lib/game/rank";

export const metadata = { title: "料理を作る" };

type RecipeRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  recipe_ingredients: { ingredient_id: string }[];
};

type CardRow = {
  id: string;
  ingredient_id: string;
  ingredients_master: { name: string } | null;
};

type FamilyCardRow = {
  card_id: string;
  owned_count: number;
};

type FamilyDishRow = {
  recipe_id: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

export default async function GameCookPage() {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const [{ data: recipes, error: recipesError }, { data: cards, error: cardsError }, { data: familyCards, error: familyCardsError }, { data: dishes, error: dishesError }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select("id, title, category, genre, recipe_ingredients(ingredient_id)")
        .order("title", { ascending: true })
        .returns<RecipeRow[]>(),
      supabase.from("game_cards").select("id, ingredient_id, ingredients_master(name)").returns<CardRow[]>(),
      supabase.from("family_cards").select("card_id, owned_count").eq("family_id", familyId).returns<FamilyCardRow[]>(),
      supabase
        .from("family_dishes")
        .select("recipe_id, created_at, profiles(display_name)")
        .eq("family_id", familyId)
        .returns<FamilyDishRow[]>(),
    ]);

  if (recipesError) throw new Error(`レシピの取得に失敗しました: ${recipesError.message}`);
  if (cardsError) throw new Error(`カード一覧の取得に失敗しました: ${cardsError.message}`);
  if (familyCardsError) throw new Error(`所持カードの取得に失敗しました: ${familyCardsError.message}`);
  if (dishesError) throw new Error(`達成済みレシピの取得に失敗しました: ${dishesError.message}`);

  const ingredientToCard = new Map((cards ?? []).map((c) => [c.ingredient_id, c]));
  const ownedCountByCard = new Map((familyCards ?? []).map((fc) => [fc.card_id, fc.owned_count]));
  const dishByRecipeId = new Map((dishes ?? []).map((d) => [d.recipe_id, d]));

  const items = (recipes ?? []).map((recipe) => {
    const requiredCards = Array.from(
      new Map(
        recipe.recipe_ingredients
          .map((ri) => ingredientToCard.get(ri.ingredient_id))
          .filter((c): c is CardRow => Boolean(c))
          .map((c) => [c.id, c])
      ).values()
    );
    const missingCards = requiredCards.filter((c) => (ownedCountByCard.get(c.id) ?? 0) <= 0);
    const requiredCount = requiredCards.length;
    const ownedCount = requiredCount - missingCards.length;
    const dish = dishByRecipeId.get(recipe.id) ?? null;

    return {
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      genre: recipe.genre,
      requiredCount,
      ownedCount,
      missingNames: missingCards.map((c) => c.ingredients_master?.name ?? "(不明な食材)"),
      isReady: requiredCount > 0 && ownedCount === requiredCount,
      isAchieved: dish !== null,
      achievedAt: dish?.created_at ?? null,
      achievedBy: dish?.profiles?.display_name ?? null,
    };
  });

  const eligible = items.filter((item) => item.requiredCount > 0);
  const achieved = eligible
    .filter((item) => item.isAchieved)
    .sort((a, b) => (b.achievedAt ?? "").localeCompare(a.achievedAt ?? ""));
  const candidates = eligible
    .filter((item) => !item.isAchieved)
    .sort((a, b) => {
      const rateA = a.ownedCount / a.requiredCount;
      const rateB = b.ownedCount / b.requiredCount;
      if (rateA !== rateB) return rateB - rateA;
      return a.title.localeCompare(b.title, "ja");
    });
  const skippedCount = items.length - eligible.length;

  const rankStatus = getFamilyRankStatus(achieved.length);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/game" className="text-sm text-brand-700 hover:underline">
        ← 食材図鑑に戻る
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ZoneIcon zone="game" icon="🍳" />
        <h1 className="text-2xl font-bold">料理を作る</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        レシピの材料をカードで100%そろえると「料理を作る」が実行できます。使ったカードはそれぞれ1枚消費されますが、図鑑の入手済み表示は消えません。1つのレシピにつき家族で1回だけ達成できます。
      </p>

      <div className="mt-6 rounded-xl bg-white p-4 shadow-raised">
        <p className="text-sm text-gray-500">家族ランク</p>
        <p className="mt-1 text-xl font-bold">{rankStatus.rank.label}</p>
        <p className="mt-1 text-sm text-gray-500">
          達成 {rankStatus.achievedCount} <span className="text-gray-400">/ {MAX_DISH_COUNT}種</span>
          {rankStatus.nextRank ? `(次の「${rankStatus.nextRank.label}」まであと${rankStatus.toNextRank}種)` : "(最上位に到達しています)"}
        </p>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-gray-700">作れるレシピ・あと少しのレシピ</h2>
        {candidates.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">対象のレシピがありません。</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {candidates.map((item) => {
              const color = getCategoryColor(item.category);
              return (
                <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-raised">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/recipes/${item.id}`} className="font-semibold hover:underline">
                          {item.title}
                        </Link>
                        {item.category ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
                            {item.category}
                          </span>
                        ) : null}
                        {item.genre ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{item.genre}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        食材カード {item.ownedCount} / {item.requiredCount}
                        {item.missingNames.length > 0 ? `・不足: ${item.missingNames.join("、")}` : ""}
                      </p>
                    </div>
                    {item.isReady ? <MakeDishButton recipeId={item.id} title={item.title} /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {achieved.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-gray-700">達成済み</h2>
          <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {achieved.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <Link href={`/recipes/${item.id}`} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <span className="shrink-0 text-xs text-gray-400">
                  {item.achievedBy ?? "だれか"} さん・
                  {item.achievedAt
                    ? new Date(item.achievedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {skippedCount > 0 ? (
        <p className="mt-6 text-xs text-gray-400">
          カード化された食材を材料に含まないレシピ{skippedCount}件は対象外です。
        </p>
      ) : null}
    </div>
  );
}
