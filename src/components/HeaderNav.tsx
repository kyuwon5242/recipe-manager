"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { ZONES, type Zone } from "@/lib/zones";

const NAV_ITEMS: { href: string; label: string; zone: Zone; icon?: string; title: string; aiGated?: boolean }[] = [
  { href: "/recipes", label: "レシピ一覧", zone: "recipe", title: "登録済みのレシピを探す・見返す" },
  {
    href: "/recipe-suggestions",
    label: "新レシピ提案",
    zone: "ai",
    title: "AIに新しいレシピ案を考えてもらう",
    aiGated: true,
  },
  {
    href: "/menu-plan",
    label: "献立提案",
    zone: "ai",
    icon: "🍽️",
    title: "品目ごとに献立をまとめて提案してもらう",
    aiGated: true,
  },
  {
    href: "/shopping-list",
    label: "食材リストを作成",
    zone: "shopping",
    icon: "📝",
    title: "作る予定のレシピから、必要な食材を洗い出す",
  },
  {
    href: "/shopping-lists",
    label: "買い物リスト",
    zone: "shopping",
    title: "確定した買い物リストを家族と共有・チェックする",
  },
];

function pillClass(active: boolean, zone: Zone): string {
  const z = ZONES[zone];
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${z.bg} ${z.text} ${
    active ? "shadow-inner ring-1 ring-black/10" : "hover:opacity-75"
  }`;
}

export function HeaderNav({
  familyName,
  isAdmin,
  canUseMenuAgent,
  canUseAiFeatures,
  userEmail,
}: {
  familyName: string | null;
  isAdmin: boolean;
  canUseMenuAgent: boolean;
  canUseAiFeatures: boolean;
  userEmail: string;
}) {
  const pathname = usePathname();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.aiGated || canUseAiFeatures);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {visibleNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.title}
          className={pillClass(pathname === item.href, item.zone)}
        >
          <span aria-hidden="true">{item.icon ?? ZONES[item.zone].icon}</span>
          {item.label}
        </Link>
      ))}
      <Link
        href="/family"
        title="招待コードの確認・メンバー管理"
        className={pillClass(pathname === "/family" || pathname === "/family/setup", "family")}
      >
        <span aria-hidden="true">{ZONES.family.icon}</span>
        {familyName ?? "家族設定"}
      </Link>
      {isAdmin || canUseMenuAgent ? (
        <Link
          href="/menu-agent"
          title="会話しながら献立を決め、買い物リスト作成まで進める(実験機能)"
          className={pillClass(pathname === "/menu-agent", "ai")}
        >
          <span aria-hidden="true">✨</span>
          献立エージェント
        </Link>
      ) : null}
      {isAdmin ? (
        <Link
          href="/admin"
          title="全レシピ・ユーザー管理など管理者専用の機能"
          className={pillClass(pathname.startsWith("/admin") || pathname === "/ingredients", "admin")}
        >
          <span aria-hidden="true">{ZONES.admin.icon}</span>
          管理者
        </Link>
      ) : null}
      <span className="px-2 text-gray-400">{userEmail}</span>
      <form action={signOut}>
        <button type="submit" className="rounded-full px-3 py-1.5 text-gray-500 hover:text-gray-700">
          サインアウト
        </button>
      </form>
    </div>
  );
}
