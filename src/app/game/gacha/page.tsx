import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { getGachaStatus } from "@/lib/game/gacha";
import { ZoneIcon } from "@/components/ZoneIcon";
import { GachaDrawer } from "@/components/GachaDrawer";

export const metadata = { title: "今日のガチャ" };

export default async function GachaPage() {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();
  const status = await getGachaStatus(supabase, familyId);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/game" className="text-sm text-brand-700 hover:underline">
        ← 食材図鑑に戻る
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ZoneIcon zone="game" icon="🎁" />
        <h1 className="text-2xl font-bold">今日のガチャ</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        家族みんなで1日{status.baseDraws}回まで引けます。誰が引いても同じ回数を使います。旬の食材ほど出やすく、めずらしいカードほど出にくくなっています。
      </p>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-raised">
        <p className="text-sm text-gray-500">今日の残り回数</p>
        <p className="mt-1 text-2xl font-bold">
          {status.remainingDraws} <span className="text-base font-normal text-gray-400">/ {status.baseDraws + status.bonusDraws} 回</span>
        </p>
        {status.bonusDraws > 0 ? (
          <p className="mt-1 text-xs text-brand-700">クイズのボーナス +{status.bonusDraws}回 を含みます</p>
        ) : null}
      </div>

      <GachaDrawer remainingDraws={status.remainingDraws} />
    </div>
  );
}
