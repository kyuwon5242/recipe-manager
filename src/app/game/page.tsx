import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "食材図鑑" };

export default async function GamePage() {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const [{ count: totalCards }, { count: ownedCards }] = await Promise.all([
    supabase.from("game_cards").select("id", { count: "exact", head: true }),
    supabase
      .from("family_cards")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .gt("owned_count", 0),
  ]);

  const total = totalCards ?? 0;
  const owned = ownedCards ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="game" />
        <h1 className="text-2xl font-bold">食材図鑑</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        旬の食材カードを集めて、家族の図鑑を育てていく機能です。ガチャ・クイズ・料理作成は準備中で、まずは図鑑の閲覧から利用できます。
      </p>

      <div className="mt-6 rounded-xl bg-white p-4 shadow-raised">
        <p className="text-sm text-gray-500">図鑑の進み具合</p>
        <p className="mt-1 text-2xl font-bold">
          {owned} <span className="text-base font-normal text-gray-400">/ {total} 枚</span>
        </p>
      </div>

      <Link
        href="/game/cards"
        className="mt-4 block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
      >
        <p className="font-bold">図鑑を見る</p>
        <p className="mt-1 text-xs text-gray-500">カード一覧・詳細を確認できます</p>
      </Link>
    </div>
  );
}
