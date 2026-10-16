import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { DishCardVisual } from "@/components/DishCardVisual";
import { DISH_CATALOG } from "@/lib/game/dish-catalog";
import { resolveDishImageSrc } from "@/lib/game/dish-image";
import { getReadyDishTitles } from "@/lib/game/dish-progress";

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
    .select("id")
    .eq("family_id", familyId)
    .eq("title", title)
    .maybeSingle();

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
  const readyTitles = await getReadyDishTitles(supabase, familyId);
  const isReady = readyTitles.has(title);

  return (
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
            <p className="mt-4 text-sm text-gray-500">
              {isReady
                ? "✨ 食材カードがそろいました!「料理を作る」で達成できます。"
                : "まだ達成していない料理です。「料理を作る」でカードがそろっているか確認できます。"}
            </p>
            <Link
              href="/game/cook"
              className="mt-4 block animate-[bounce_2s_infinite] rounded-full bg-gradient-to-r from-amber-400 to-brand-600 px-4 py-2 text-center text-sm font-bold text-white shadow-brand transition hover:scale-105 active:scale-95"
            >
              {"🍳 Let's Cooking!"}
            </Link>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">このレシピはまだ登録されていません。</p>
        )}
      </div>
    </div>
  );
}
