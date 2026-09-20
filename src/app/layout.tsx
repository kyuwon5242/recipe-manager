import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { MealPlanTrayProvider } from "@/lib/meal-plan-tray/context";
import { ManagerFaceIcon } from "@/components/ManagerFaceIcon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "レシピマネージャー",
    template: "%s | レシピマネージャー",
  },
  description: "家族で共有する自炊レシピ管理アプリ",
};

type FamilyNameRow = {
  families: { name: string } | null;
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let familyName: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("family_members")
      .select("families(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle<FamilyNameRow>();
    familyName = data?.families?.name ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/recipes" className="flex items-center gap-2 text-lg font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                <ManagerFaceIcon className="h-8 w-8" />
              </span>
              レシピマネージャー
            </Link>
            {user ? (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href="/recipe-suggestions"
                  className="font-medium text-brand-700 hover:underline"
                >
                  新レシピ提案
                </Link>
                <Link
                  href="/menu-plan"
                  className="font-medium text-brand-700 hover:underline"
                >
                  献立提案
                </Link>
                <Link
                  href="/shopping-list"
                  className="font-medium text-brand-700 hover:underline"
                >
                  食材リストを作成
                </Link>
                <Link
                  href="/shopping-lists"
                  className="font-medium text-brand-700 hover:underline"
                >
                  買い物リスト
                </Link>
                <Link href="/family" className="text-gray-500 hover:underline">
                  {familyName ?? "家族設定"}
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="font-medium text-purple-700 hover:underline"
                  >
                    管理者
                  </Link>
                ) : null}
                <span className="text-gray-400">{user.email}</span>
                <form action={signOut}>
                  <button type="submit" className="text-gray-500 hover:underline">
                    サインアウト
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>
        <main className="flex-1">
          <MealPlanTrayProvider>{children}</MealPlanTrayProvider>
        </main>
      </body>
    </html>
  );
}
