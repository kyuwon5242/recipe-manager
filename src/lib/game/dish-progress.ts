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
