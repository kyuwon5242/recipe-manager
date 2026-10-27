import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZoneIcon } from "@/components/ZoneIcon";
import { RecipeLink } from "@/components/RecipeLink";
import { MealHistorySection } from "@/components/MealHistorySection";
import { UsageScenarioBanner } from "@/components/UsageScenarioBanner";
import { SeasonalIngredientsTicker, type SeasonalCardItem } from "@/components/SeasonalIngredientsTicker";
import { HelpPanel } from "@/components/HelpPanel";
import { AiQuotaGauge } from "@/components/AiQuotaGauge";
import { getAiQuotaStatus } from "@/lib/ai-usage/quota";
import { getCurrentFamilyId } from "@/lib/family/current";
import { currentJstMonth, isInSeasonMonth } from "@/lib/season";
import { sortByCategoryOrder, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { resolveCardImageSrc } from "@/lib/game/card-image";
import type { CardRarity } from "@/lib/game/cards";
import type { Zone } from "@/lib/zones";

type LatestMealRow = {
  id: string;
  created_at: string;
  updated_at: string;
  meal_memo: string | null;
  shopping_list_recipes: {
    position: number;
    servings: number | null;
    recipes: { id: string; title: string; genre: string | null; category: string | null } | null;
  }[];
};

type SeasonalCardRow = {
  id: string;
  rarity: CardRarity;
  illustration_url: string | null;
  ingredients_master: {
    name: string;
    reading: string | null;
    category: string | null;
    season_months: number[] | null;
  } | null;
};

const HELP_ITEMS = [
  {
    label: "各カードについて",
    desc: "レシピ一覧・新レシピ提案・献立提案・買い物リスト・家族設定など、機能ごとにカードから移動できます。食材リストの作成は、献立トレイ(画面右下のボタン)から進みます。",
  },
  {
    label: "上のバナーについて",
    desc: "状況に応じたおすすめの使い方が数秒ごとに切り替わります。下のドットをタップすると好きな使い方をすぐ確認できます。",
  },
];

export const metadata = { title: "ホーム" };

type HomeCard = {
  href: string;
  zone: Zone;
  icon?: string;
  title: string;
  desc: string;
  aiGated?: boolean;
};

const CARDS: HomeCard[] = [
  { href: "/recipes", zone: "recipe", title: "レシピ一覧", desc: "登録済みのレシピを探す・見返す" },
  {
    href: "/recipe-suggestions",
    zone: "ai",
    title: "新レシピ提案",
    desc: "AIに新しいレシピ案を考えてもらう",
    aiGated: true,
  },
  {
    href: "/menu-plan",
    zone: "ai",
    icon: "🍽️",
    title: "献立提案",
    desc: "品目ごとに献立をまとめて提案してもらう",
    aiGated: true,
  },
  { href: "/shopping-lists", zone: "shopping", icon: "📝", title: "買い物リスト", desc: "確定リストを家族と共有・チェック" },
  { href: "/family", zone: "family", title: "家族設定", desc: "招待コード・メンバー管理" },
  { href: "/game/gacha", zone: "game", icon: "🎁", title: "今日のガチャ", desc: "1日3回、旬の食材カードを引く" },
  { href: "/game", zone: "game", icon: "🃏", title: "食材図鑑", desc: "旬の食材カードを集めて家族の図鑑を育てる" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name, can_use_menu_agent, can_use_ai_features")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.is_admin ?? false;
  const canUseMenuAgent = isAdmin || (profile?.can_use_menu_agent ?? false);
  const canUseAiFeatures = isAdmin || (profile?.can_use_ai_features ?? false);
  const quota = await getAiQuotaStatus(supabase);
  const visibleCards = CARDS.filter((card) => !card.aiGated || canUseAiFeatures);

  const familyId = await getCurrentFamilyId().catch(() => null);
  let latestMealRecipes: { id: string; title: string; servings: number | null }[] = [];
  let latestMealMemo: string | null = null;
  let mealHistory: {
    id: string;
    createdAt: string;
    memo: string | null;
    recipes: { id: string; title: string; servings: number | null; genre: string | null; category: string | null }[];
  }[] = [];
  if (familyId) {
    const { data: recentLists } = await supabase
      .from("shopping_lists")
      .select(
        "id, created_at, updated_at, meal_memo, shopping_list_recipes(position, servings, recipes(id, title, genre, category))"
      )
      .eq("family_id", familyId)
      // 上限到達時に既存リストを上書きした場合、created_atは最初の作成時のまま
      // 更新されないため、直近順の判定にはupdated_atを使う。
      .order("updated_at", { ascending: false })
      .limit(3)
      .returns<LatestMealRow[]>();

    mealHistory = (recentLists ?? []).map((list) => ({
      id: list.id,
      createdAt: list.updated_at,
      memo: list.meal_memo,
      recipes: list.shopping_list_recipes
        .slice()
        .sort((a, b) => a.position - b.position)
        .filter((r) => r.recipes !== null)
        .map((r) => ({
          id: r.recipes!.id,
          title: r.recipes!.title,
          servings: r.servings,
          genre: r.recipes!.genre,
          category: r.recipes!.category,
        })),
    }));

    const latest = mealHistory[0];
    latestMealRecipes = latest?.recipes ?? [];
    latestMealMemo = latest?.memo ?? null;
  }

  // 今が旬の食材カードをホームでアニメーション表示する(食材図鑑と同じ
  // カードを再利用。未入手のものもシルエットで含める)。
  const currentMonth = currentJstMonth();
  let seasonalCards: SeasonalCardItem[] = [];
  {
    const { data: cards } = await supabase
      .from("game_cards")
      .select("id, rarity, illustration_url, ingredients_master(name, reading, category, season_months)")
      .returns<SeasonalCardRow[]>();

    const inSeason = (cards ?? []).filter((c) =>
      isInSeasonMonth(c.ingredients_master?.season_months, currentMonth)
    );

    let acquiredCardIds = new Set<string>();
    if (familyId && inSeason.length > 0) {
      const { data: owned } = await supabase
        .from("family_cards")
        .select("card_id, first_acquired_at")
        .eq("family_id", familyId);
      acquiredCardIds = new Set(
        (owned ?? []).filter((o) => o.first_acquired_at !== null).map((o) => o.card_id)
      );
    }

    const mapped: SeasonalCardItem[] = inSeason.map((card) => {
      const isOwned = acquiredCardIds.has(card.id);
      return {
        id: card.id,
        rarity: card.rarity,
        src: isOwned ? resolveCardImageSrc(card.illustration_url) : null,
        name: card.ingredients_master?.name ?? "(不明な食材)",
        reading: card.ingredients_master?.reading ?? null,
        category: card.ingredients_master?.category ?? UNCATEGORIZED_LABEL,
        seasonMonths: card.ingredients_master?.season_months ?? null,
        isOwned,
      };
    });
    seasonalCards = sortByCategoryOrder(mapped);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">今日は何を作りますか?</h1>
        <HelpPanel title="ホーム" items={HELP_ITEMS} />
      </div>
      {canUseAiFeatures ? <AiQuotaGauge status={quota} /> : null}

      <SeasonalIngredientsTicker items={seasonalCards} />

      {latestMealRecipes.length > 0 ? (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-raised">
          <p className="font-bold">🍳 今回つくるレシピはこれ</p>
          <p className="mt-1 text-xs text-gray-500">直近で確定した買い物リストのもとになったレシピです。</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {latestMealRecipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeLink
                  recipeId={recipe.id}
                  servings={recipe.servings}
                  className="inline-block rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  {recipe.title}
                  {recipe.servings ? (
                    <span className="ml-1 font-normal text-brand-400">({recipe.servings}人前)</span>
                  ) : null}
                </RecipeLink>
              </li>
            ))}
          </ul>
          {latestMealMemo ? (
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              📝 {latestMealMemo}
            </p>
          ) : null}
        </div>
      ) : null}

      <MealHistorySection sets={mealHistory} />

      <UsageScenarioBanner />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
          >
            <ZoneIcon zone={card.zone} icon={card.icon} className="mb-3" />
            <p className="font-bold">{card.title}</p>
            <p className="mt-1 text-xs text-gray-500">{card.desc}</p>
          </Link>
        ))}
        {canUseMenuAgent ? (
          <Link
            href="/menu-agent"
            className="block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
          >
            <ZoneIcon zone="ai" icon="✨" className="mb-3" />
            <p className="font-bold">献立エージェント</p>
            <p className="mt-1 text-xs text-gray-500">会話しながら献立〜買い物リスト作成まで進める(実験機能)</p>
          </Link>
        ) : null}
        {isAdmin ? (
          <Link
            href="/admin"
            className="block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5 sm:col-span-2 md:col-span-3"
          >
            <ZoneIcon zone="admin" className="mb-3" />
            <p className="font-bold">管理者メニュー</p>
            <p className="mt-1 text-xs text-gray-500">全レシピ・ユーザー管理(管理者のみ表示)</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
