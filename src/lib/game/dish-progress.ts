import type { SupabaseClient } from "@supabase/supabase-js";
import { DISH_CATALOG } from "@/lib/game/dish-catalog";

type AchievedRow = {
  recipes: { title: string } | null;
};

// 料理図鑑(DISH_CATALOG、50品)のうち、家族が「料理を作る」で達成したタイトルの集合。
// family_dishes の件数(=家族ランクの母数)は図鑑の50品に限らないため、
// 図鑑画面の進捗表示には必ずこちらを使う(game-design.md 10章)。
export async function getAchievedDishTitles(
  supabase: SupabaseClient,
  familyId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("family_dishes")
    .select("recipes(title)")
    .eq("family_id", familyId)
    .returns<AchievedRow[]>();

  if (error) {
    throw new Error(`達成済み料理の取得に失敗しました: ${error.message}`);
  }

  const titles = new Set((data ?? []).map((row) => row.recipes?.title).filter((t): t is string => Boolean(t)));
  const catalogTitles = new Set(DISH_CATALOG.map((d) => d.title));
  return new Set([...titles].filter((t) => catalogTitles.has(t)));
}

type RecipeForReadiness = {
  title: string;
  recipe_ingredients: { ingredient_id: string }[];
};

// 料理図鑑(DISH_CATALOG)のうち、材料のカードが100%そろっている(=「料理を作る」
// を実行できる)タイトルの集合。達成済みかどうかは問わない(game-design.md 10章、
// 一覧画面で「作れるようになった料理カード」を光らせるために使う)。
export async function getReadyDishTitles(supabase: SupabaseClient, familyId: string): Promise<Set<string>> {
  const catalogTitles = new Set(DISH_CATALOG.map((d) => d.title));

  const [{ data: recipes, error: recipesError }, { data: cards, error: cardsError }, { data: familyCards, error: familyCardsError }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select("title, recipe_ingredients(ingredient_id)")
        .eq("family_id", familyId)
        .returns<RecipeForReadiness[]>(),
      supabase.from("game_cards").select("id, ingredient_id"),
      supabase.from("family_cards").select("card_id, owned_count").eq("family_id", familyId),
    ]);

  if (recipesError) throw new Error(`レシピの取得に失敗しました: ${recipesError.message}`);
  if (cardsError) throw new Error(`カード一覧の取得に失敗しました: ${cardsError.message}`);
  if (familyCardsError) throw new Error(`所持カードの取得に失敗しました: ${familyCardsError.message}`);

  const ingredientToCardId = new Map((cards ?? []).map((c) => [c.ingredient_id, c.id]));
  const ownedCountByCard = new Map((familyCards ?? []).map((fc) => [fc.card_id, fc.owned_count]));

  const ready = new Set<string>();
  for (const recipe of recipes ?? []) {
    if (!catalogTitles.has(recipe.title)) continue;
    const requiredCardIds = Array.from(
      new Set(
        recipe.recipe_ingredients
          .map((ri) => ingredientToCardId.get(ri.ingredient_id))
          .filter((id): id is string => Boolean(id))
      )
    );
    if (requiredCardIds.length === 0) continue;
    const allOwned = requiredCardIds.every((id) => (ownedCountByCard.get(id) ?? 0) > 0);
    if (allOwned) ready.add(recipe.title);
  }
  return ready;
}
