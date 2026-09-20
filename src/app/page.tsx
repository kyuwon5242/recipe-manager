import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZoneIcon } from "@/components/ZoneIcon";
import type { Zone } from "@/lib/zones";

export const metadata = { title: "ホーム" };

type HomeCard = {
  href: string;
  zone: Zone;
  icon?: string;
  title: string;
  desc: string;
};

const CARDS: HomeCard[] = [
  { href: "/recipes", zone: "recipe", title: "レシピ一覧", desc: "登録済みのレシピを探す・見返す" },
  { href: "/recipe-suggestions", zone: "ai", title: "新レシピ提案", desc: "AIに新しいレシピ案を考えてもらう" },
  { href: "/menu-plan", zone: "ai", icon: "🍽️", title: "献立提案", desc: "品目ごとに献立をまとめて提案してもらう" },
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
    .select("is_admin, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.is_admin ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm text-gray-500">おかえりなさい</p>
      <h1 className="mt-1 text-2xl font-bold">今日は何を作りますか?</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {CARDS.map((card) => (
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
