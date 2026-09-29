import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { getGachaStatus } from "@/lib/game/gacha";
import { getQuizStatus } from "@/lib/game/quiz";
import { RARITY_BADGE_STYLES, RARITY_LABELS, type CardRarity } from "@/lib/game/cards";
import { getFamilyRankStatus, MAX_DISH_COUNT } from "@/lib/game/rank";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "食材図鑑" };

type RecentAcquisitionRow = {
  id: string;
  acquired_at: string;
  profiles: { display_name: string | null } | null;
  game_cards: {
    id: string;
    rarity: CardRarity;
    ingredients_master: { name: string } | null;
  } | null;
};

export default async function GamePage() {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const [
    { count: totalCards },
    { count: ownedCards },
    { count: achievedDishes },
    gachaStatus,
    quizStatus,
    { data: recent, error: recentError },
  ] = await Promise.all([
    supabase.from("game_cards").select("id", { count: "exact", head: true }),
    supabase
      .from("family_cards")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .not("first_acquired_at", "is", null),
    supabase.from("family_dishes").select("id", { count: "exact", head: true }).eq("family_id", familyId),
    getGachaStatus(supabase, familyId),
    getQuizStatus(supabase),
    supabase
      .from("card_acquisitions")
      .select("id, acquired_at, profiles(display_name), game_cards(id, rarity, ingredients_master(name))")
      .eq("family_id", familyId)
      .order("acquired_at", { ascending: false })
      .limit(5)
      .returns<RecentAcquisitionRow[]>(),
  ]);

  if (recentError) {
    throw new Error(`直近の入手カードの取得に失敗しました: ${recentError.message}`);
  }

  const total = totalCards ?? 0;
  const owned = ownedCards ?? 0;
  const rankStatus = getFamilyRankStatus(achievedDishes ?? 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="game" />
        <h1 className="text-2xl font-bold">食材図鑑</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        旬の食材カードを集めて、家族の図鑑を育てていく機能です。集めたカードで料理を作ると、家族のランクが上がっていきます。
      </p>

      <div className="mt-6 rounded-xl bg-white p-4 shadow-raised">
        <p className="text-sm text-gray-500">家族ランク</p>
        <p className="mt-1 text-2xl font-bold">{rankStatus.rank.label}</p>
        <p className="mt-1 text-xs text-gray-500">
          達成 {rankStatus.achievedCount} / {MAX_DISH_COUNT}種
          {rankStatus.nextRank
            ? `・次の「${rankStatus.nextRank.label}」まであと${rankStatus.toNextRank}種`
            : "・最上位に到達しています"}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-raised">
        <p className="text-sm text-gray-500">図鑑の進み具合</p>
        <p className="mt-1 text-2xl font-bold">
          {owned} <span className="text-base font-normal text-gray-400">/ {total} 枚</span>
        </p>
      </div>

      <Link
        href="/game/cook"
        className="mt-4 block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
      >
        <p className="font-bold">🍳 料理を作る</p>
        <p className="mt-1 text-xs text-gray-500">カードがそろったレシピで「料理を作る」を実行し、家族ランクを上げる</p>
      </Link>

      <Link
        href="/game/gacha"
        className="mt-4 block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
      >
        <p className="font-bold">🎁 今日のガチャ</p>
        <p className="mt-1 text-xs text-gray-500">
          {gachaStatus.remainingDraws > 0
            ? `あなたは今日あと${gachaStatus.remainingDraws}回引けます`
            : "今日のガチャはおしまいです。また明日引けます"}
        </p>
      </Link>

      <Link
        href="/game/quiz"
        className="mt-4 block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
      >
        <p className="font-bold">❓ 今日のクイズ</p>
        <p className="mt-1 text-xs text-gray-500">
          {quizStatus.answeredToday >= quizStatus.dailyLimit
            ? `今日の${quizStatus.dailyLimit}問は終わりました(${quizStatus.correctToday}問 正解)`
            : `あなたは今日 ${quizStatus.answeredToday}/${quizStatus.dailyLimit}問 回答済み。${quizStatus.dailyLimit}問全問正解でガチャが+1回ふえます`}
        </p>
      </Link>

      <Link
        href="/game/cards"
        className="mt-4 block rounded-xl bg-white p-4 shadow-raised transition hover:-translate-y-0.5"
      >
        <p className="font-bold">図鑑を見る</p>
        <p className="mt-1 text-xs text-gray-500">カード一覧・詳細を確認できます</p>
      </Link>

      {(recent ?? []).length > 0 ? (
        <div className="mt-6 rounded-xl bg-white p-4 shadow-raised">
          <p className="text-sm font-bold text-gray-700">最近入手したカード</p>
          <ul className="mt-2 divide-y divide-gray-100">
            {(recent ?? []).map((a) => {
              const rarity = a.game_cards?.rarity;
              return (
                <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
                  {rarity ? (
                    <span
                      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs ${RARITY_BADGE_STYLES[rarity].bg} ${RARITY_BADGE_STYLES[rarity].text}`}
                    >
                      {RARITY_LABELS[rarity]}
                    </span>
                  ) : null}
                  {a.game_cards ? (
                    <Link href={`/game/cards/${a.game_cards.id}`} className="font-medium text-brand-700 hover:underline">
                      {a.game_cards.ingredients_master?.name ?? "(不明な食材)"}
                    </Link>
                  ) : (
                    <span>(削除されたカード)</span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-gray-400">
                    {a.profiles?.display_name ?? "だれか"} さん・
                    {new Date(a.acquired_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
