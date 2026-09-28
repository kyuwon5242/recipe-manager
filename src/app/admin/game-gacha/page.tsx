import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { GachaSettingsForm } from "@/components/GachaSettingsForm";
import { getGachaSettings } from "@/lib/game/gacha-settings";
import { CARD_RARITIES, type CardRarity } from "@/lib/game/cards";

export const metadata = { title: "ガチャ確率設定" };

export default async function AdminGameGachaPage() {
  const { supabase } = await requireAdmin();

  const [settings, { data: cards, error }] = await Promise.all([
    getGachaSettings(supabase),
    supabase.from("game_cards").select("rarity").returns<{ rarity: CardRarity }[]>(),
  ]);

  if (error) {
    throw new Error(`カード枚数の取得に失敗しました: ${error.message}`);
  }

  const cardCounts = Object.fromEntries(CARD_RARITIES.map((r) => [r, 0])) as Record<CardRarity, number>;
  for (const card of cards ?? []) {
    cardCounts[card.rarity] += 1;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ZoneIcon zone="admin" icon="🎁" />
        <h1 className="text-2xl font-bold">ガチャ確率設定</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        食材図鑑のガチャの出現確率をアプリ全体で調整できます(家族単位の設定ではありません)。まずレアリティを重みで選び、そのレアリティの中から1枚を選ぶ2段階の抽選なので、カード枚数が増減してもレアリティごとの出現率は変わりません。
      </p>
      <GachaSettingsForm settings={settings} cardCounts={cardCounts} />
    </div>
  );
}
