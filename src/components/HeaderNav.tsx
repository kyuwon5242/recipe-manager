"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { ZONES, type Zone } from "@/lib/zones";

const NAV_ITEMS: { href: string; label: string; zone: Zone; icon?: string }[] = [
  { href: "/recipes", label: "レシピ一覧", zone: "recipe" },
  { href: "/recipe-suggestions", label: "新レシピ提案", zone: "ai" },
  { href: "/menu-plan", label: "献立提案", zone: "ai", icon: "🍽️" },
  { href: "/shopping-list", label: "食材リストを作成", zone: "shopping", icon: "📝" },
  { href: "/shopping-lists", label: "買い物リスト", zone: "shopping" },
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
  userEmail,
}: {
  familyName: string | null;
  isAdmin: boolean;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pillClass(pathname === item.href, item.zone)}
        >
          <span aria-hidden="true">{item.icon ?? ZONES[item.zone].icon}</span>
          {item.label}
        </Link>
      ))}
      <Link
        href="/family"
        className={pillClass(pathname === "/family" || pathname === "/family/setup", "family")}
      >
        <span aria-hidden="true">{ZONES.family.icon}</span>
        {familyName ?? "家族設定"}
      </Link>
      {isAdmin ? (
        <Link
          href="/admin"
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
