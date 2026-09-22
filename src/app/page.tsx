import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZoneIcon } from "@/components/ZoneIcon";
import { UsageScenarioBanner } from "@/components/UsageScenarioBanner";
import { HelpPanel } from "@/components/HelpPanel";
import { AiQuotaGauge } from "@/components/AiQuotaGauge";
import { getAiQuotaStatus } from "@/lib/ai-usage/quota";
import { getCurrentFamilyId } from "@/lib/family/current";
import type { Zone } from "@/lib/zones";

type LatestMealRow = {
  shopping_list_recipes: { position: number; recipes: { id: string; title: string } | null }[];
};

const HELP_ITEMS = [
  {
    label: "各カードについて",
    desc: "レシピ一覧・新レシピ提案・献立提案・食材リストを作成・買い物リスト・家族設定など、機能ごとにカードから移動できます。",
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
  { href: "/shopping-list", zone: "shopping", icon: "📝", title: "食材リストを作成", desc: "献立から必要な食材を洗い出す" },
  { href: "/shopping-lists", zone: "shopping", title: "買い物リスト", desc: "確定リストを家族と共有・チェック" },
  { href: "/family", zone: "family", title: "家族設定", desc: "招待コード・メンバー管理" },
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
  let latestMealRecipes: { id: string; title: string }[] = [];
  if (familyId) {
    const { data: latestList } = await supabase
      .from("shopping_lists")
      .select("id, shopping_list_recipes(position, recipes(id, title))")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<LatestMealRow>();

    latestMealRecipes = (latestList?.shopping_list_recipes ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((r) => r.recipes)
      .filter((r): r is { id: string; title: string } => r !== null);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">今日は何を作りますか?</h1>
        <HelpPanel title="ホーム" items={HELP_ITEMS} />
      </div>
      {canUseAiFeatures ? <AiQuotaGauge status={quota} /> : null}

      {latestMealRecipes.length > 0 ? (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-raised">
          <p className="font-bold">🍳 今回つくるレシピはこれ</p>
          <p className="mt-1 text-xs text-gray-500">直近で確定した買い物リストのもとになったレシピです。</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {latestMealRecipes.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="inline-block rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
