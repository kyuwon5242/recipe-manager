import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { DishCardVisual } from "@/components/DishCardVisual";
import { DISH_CATALOG } from "@/lib/game/dish-catalog";
import { resolveDishImageSrc } from "@/lib/game/dish-image";
import { getAchievedDishTitles, getReadyDishTitles } from "@/lib/game/dish-progress";
import { GENRE_TABS } from "@/lib/recipe-genre";
import { MAX_DISH_COUNT } from "@/lib/game/rank";

export const metadata = { title: "料理図鑑" };

export default async function GameDishesPage() {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const [achievedTitles, readyTitles] = await Promise.all([
    getAchievedDishTitles(supabase, familyId),
    getReadyDishTitles(supabase, familyId),
  ]);

  const items = DISH_CATALOG.map((dish) => ({
    ...dish,
    isAchieved: achievedTitles.has(dish.title),
    isReady: readyTitles.has(dish.title),
    src: achievedTitles.has(dish.title) ? resolveDishImageSrc(dish.title) : null,
  }));

  const grouped = GENRE_TABS.filter((g) => g !== "その他").map((genre) => ({
    genre,
    items: items.filter((item) => item.genre === genre),
  }));

  const achievedCount = items.filter((item) => item.isAchieved).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/game" className="text-sm text-brand-700 hover:underline">
        ← 食材図鑑に戻る
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ZoneIcon zone="game" icon="🍽️" />
        <h1 className="text-2xl font-bold">料理図鑑</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        食材図鑑のカードだけで作れる定番料理{MAX_DISH_COUNT}品の図鑑です。「料理を作る」で達成すると写真が公開されます(
        達成 {achievedCount} / {MAX_DISH_COUNT}品)。
      </p>

      <div className="mt-6 space-y-8">
        {grouped.map(({ genre, items: list }) => (
          <div key={genre}>
            <h2 className="text-sm font-bold text-gray-700">{genre}</h2>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {list.map((item) => (
                <Link
                  key={item.title}
                  href={`/game/dishes/${encodeURIComponent(item.title)}`}
                  className="block transition hover:-translate-y-0.5"
                >
                  <DishCardVisual
                    title={item.title}
                    category={item.category}
                    genre={item.genre}
                    src={item.src}
                    isAchieved={item.isAchieved}
                    isReady={item.isReady}
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
