"use client";

import { useEffect, useRef, useState } from "react";
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
    href: "/shopping-lists",
    label: "買い物リスト",
    zone: "shopping",
    title: "確定した買い物リストを家族と共有・チェックする",
  },
  {
    href: "/game",
    label: "食材図鑑",
    zone: "game",
    title: "旬の食材カードを集めて、家族の図鑑を育てる",
  },
];

function pillClass(active: boolean, zone: Zone): string {
  const z = ZONES[zone];
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${z.bg} ${z.text} ${
    active ? "shadow-inner ring-1 ring-black/10" : "hover:opacity-75"
  }`;
}

// ヘッダーのロゴ・アイコンはスクロールしても常に表示されたままにしたいため
// (layout.tsxでheaderをsticky化)、他のナビゲーション項目はこのメニュー
// ボタンの中に畳み、タップしたときだけ展開するようにしている。
export function HeaderNav({
  familyName,
  isAdmin,
  canUseMenuAgent,
  canUseAiFeatures,
  displayName,
}: {
  familyName: string | null;
  isAdmin: boolean;
  canUseMenuAgent: boolean;
  canUseAiFeatures: boolean;
  displayName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.aiGated || canUseAiFeatures);

  // ページ遷移したら自動で閉じる(レンダー中にpathnameの変化を検知して
  // 状態を調整する。Reactが推奨する「propの変化に応じたstate調整」の
  // パターンで、useEffectを使うより無駄な再描画が少ない)。
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // メニュー外をタップ/クリックしたら閉じる
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="メニューを開く"
        className="flex max-w-[55vw] items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <span aria-hidden="true">☰</span>
        <span className="truncate">{displayName || "メニュー"}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[90vw] rounded-lg border border-gray-200 bg-white p-3 shadow-raised">
          <div className="flex flex-wrap gap-1.5">
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
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="truncate px-1 text-xs text-gray-400">{displayName}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                サインアウト
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
