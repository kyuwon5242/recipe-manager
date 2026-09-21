import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecipeListClient } from "@/components/RecipeListClient";
import { WithMealPlanTray } from "@/components/WithMealPlanTray";
import { ZoneIcon } from "@/components/ZoneIcon";
import { HelpPanel } from "@/components/HelpPanel";

export const metadata = { title: "レシピ一覧" };

const HELP_ITEMS = [
  { label: "検索・絞り込み", desc: "料理名や食材名で検索したり、品目タブやカテゴリで絞り込めます。" },
  { label: "お気に入り", desc: "♡アイコンをタップすると、お気に入りのみ表示に切り替えられます。" },
  {
    label: "+ 献立トレイに追加",
    desc: "気になるレシピを献立トレイに集めておくと、あとでまとめて食材リストが作れます。",
  },
];

type RecipeRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  is_favorite: boolean;
  recipe_ingredients: { ingredients_master: { name: string } | null }[];
};

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(
      "id, title, category, genre, servings, is_favorite, created_at, recipe_ingredients(ingredients_master(name))"
    )
    .order("created_at", { ascending: false })
    .returns<RecipeRow[]>();

  if (error) {
    throw new Error(`レシピの取得に失敗しました: ${error.message}`);
  }

  const items = (recipes ?? []).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    genre: recipe.genre,
    servings: recipe.servings,
    is_favorite: recipe.is_favorite,
    ingredientNames: recipe.recipe_ingredients
      .map((ri) => ri.ingredients_master?.name)
      .filter((name): name is string => Boolean(name)),
  }));

  return (
    <WithMealPlanTray maxWidth="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ZoneIcon zone="recipe" />
          <h1 className="text-2xl font-bold">レシピ一覧</h1>
          <HelpPanel title="レシピ一覧" items={HELP_ITEMS} />
        </div>
        <Link
          href="/recipes/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800"
        >
          + レシピを登録
        </Link>
      </div>
      <RecipeListClient recipes={items} />
    </WithMealPlanTray>
  );
}
