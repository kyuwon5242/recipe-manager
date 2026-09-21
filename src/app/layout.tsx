import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { HeaderNav } from "@/components/HeaderNav";
import { MealPlanTrayProvider } from "@/lib/meal-plan-tray/context";
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
  let canUseMenuAgent = false;
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
      .select("is_admin, can_use_menu_agent")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
    canUseMenuAgent = profile?.can_use_menu_agent ?? false;
  }

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper font-sans text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <Image
                src="/manager-icon.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
              />
              レシピマネージャー
            </Link>
            {user ? (
              <HeaderNav
                familyName={familyName}
                isAdmin={isAdmin}
                canUseMenuAgent={canUseMenuAgent}
                userEmail={user.email ?? ""}
              />
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
