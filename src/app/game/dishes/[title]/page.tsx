import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { DishCardVisual } from "@/components/DishCardVisual";
import { MakeDishButton } from "@/components/MakeDishButton";
import { MakeDishProvider } from "@/components/MakeDishProvider";
import { DISH_CATALOG } from "@/lib/game/dish-catalog";
import { resolveDishImageSrc } from "@/lib/game/dish-image";

type RecipeRow = {
  id: string;
  recipe_ingredients: { ingredient_id: string }[];
};

type CardRow = {
  id: string;
  ingredient_id: string;
  ingredients_master: { name: string } | null;
};

export default async function GameDishDetailPage({ params }: { params: Promise<{ title: string }> }) {
  const { title: encodedTitle } = await params;
  const title = decodeURIComponent(encodedTitle);
  const dish = DISH_CATALOG.find((d) => d.title === title);
  if (!dish) {
    notFound();
  }

  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("id, recipe_ingredients(ingredient_id)")
    .eq("family_id", familyId)
    .eq("title", title)
    .maybeSingle<RecipeRow>();

  if (recipeError) {
    throw new Error(`レシピの取得に失敗しました: ${recipeError.message}`);
  }

  let achievement: { created_at: string; display_name: string | null } | null = null;
  if (recipe) {
    const { data: dishRow, error: dishError } = await supabase
      .from("family_dishes")
      .select("created_at, profiles(display_name)")
      .eq("family_id", familyId)
      .eq("recipe_id", recipe.id)
      .maybeSingle<{ created_at: string; profiles: { display_name: string | null } | null }>();

    if (dishError) {
      throw new Error(`達成状況の取得に失敗しました: ${dishError.message}`);
    }
    if (dishRow) {
      achievement = { created_at: dishRow.created_at, display_name: dishRow.profiles?.display_name ?? null };
    }
  }

  const isAchieved = achievement !== null;
  const src = isAchieved ? resolveDishImageSrc(title) : null;

  // 「料理を作る」に必要な食材カードの充足状況(未達成のときだけ必要)。
  // かつては/game/cookが全レシピ分まとめて計算していたが、詳細ページ単体で
  // このレシピの分だけ計算する(不足食材名の表示は/game/cook廃止後もここで維持する)。
  let isReady = false;
  let missingNames: string[] = [];
  let requiredCount = 0;
  if (recipe && !isAchieved) {
    const ingredientIds = recipe.recipe_ingredients.map((ri) => ri.ingredient_id);
    if (ingredientIds.length > 0) {
      const [{ data: cards, error: cardsError }, { data: familyCards, error: familyCardsError }] = await Promise.all([
        supabase
          .from("game_cards")
          .select("id, ingredient_id, ingredients_master(name)")
          .in("ingredient_id", ingredientIds)
          .returns<CardRow[]>(),
        supabase.from("family_cards").select("card_id, owned_count").eq("family_id", familyId),
      ]);

      if (cardsError) throw new Error(`カード一覧の取得に失敗しました: ${cardsError.message}`);
      if (familyCardsError) throw new Error(`所持カードの取得に失敗しました: ${familyCardsError.message}`);

      const ownedCountByCard = new Map((familyCards ?? []).map((fc) => [fc.card_id, fc.owned_count]));
      const requiredCards = cards ?? [];
      const missingCards = requiredCards.filter((c) => (ownedCountByCard.get(c.id) ?? 0) <= 0);
      requiredCount = requiredCards.length;
      missingNames = missingCards.map((c) => c.ingredients_master?.name ?? "(不明な食材)");
      isReady = requiredCount > 0 && missingCards.length === 0;
    }
  }

  return (
    <MakeDishProvider>
      <div className="mx-auto max-w-md px-4 py-8">
        <Link href="/game/dishes" className="text-sm text-brand-700 hover:underline">
          ← 料理図鑑一覧に戻る
        </Link>

        <div className="mx-auto mt-4">
          <DishCardVisual
            title={dish.title}
            category={dish.category}
            genre={dish.genre}
            src={src}
            isAchieved={isAchieved}
            isReady={isReady}
          />
        </div>

        <div className="mt-4 rounded-xl border-2 border-white bg-white p-5 shadow-raised">
          <div className="flex items-center gap-2">
            <ZoneIcon zone="game" icon="🍽️" />
            <h1 className="text-xl font-bold">{dish.title}</h1>
          </div>

          {isAchieved ? (
            <p className="mt-4 text-sm text-gray-500">
              {achievement?.display_name ?? "だれか"} さんが達成しました
              {achievement?.created_at ? `(${new Date(achievement.created_at).toLocaleDateString("ja-JP")})` : ""}
            </p>
          ) : recipe ? (
            <>
              {requiredCount === 0 ? (
                <p className="mt-4 text-sm text-gray-500">このレシピには対応する食材カードがありません。</p>
              ) : isReady ? (
                <p className="mt-4 text-sm text-gray-500">🔓 食材カードがそろいました!「料理を作る」で達成できます。</p>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  まだ必要な食材カードがそろっていません。不足: {missingNames.join("、")}
                </p>
              )}
              {isReady ? (
                <div className="mt-4">
                  <MakeDishButton recipeId={recipe.id} title={dish.title} />
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm text-gray-500">このレシピはまだ登録されていません。</p>
          )}
        </div>
      </div>
    </MakeDishProvider>
  );
}
