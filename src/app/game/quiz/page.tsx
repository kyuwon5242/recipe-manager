import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getQuizStatus } from "@/lib/game/quiz";
import { ZoneIcon } from "@/components/ZoneIcon";
import { QuizPlayer } from "@/components/QuizPlayer";
import { AiContentNotice } from "@/components/AiContentNotice";

export const metadata = { title: "今日のクイズ" };

export default async function QuizPage() {
  const supabase = await createClient();
  const status = await getQuizStatus(supabase);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/game" className="text-sm text-brand-700 hover:underline">
        ← 食材図鑑に戻る
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ZoneIcon zone="game" icon="❓" />
        <h1 className="text-2xl font-bold">今日のクイズ</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        食材や栄養のクイズです。1人1日{status.dailyLimit}問まで挑戦でき、{status.dailyLimit}問すべてに正解するとあなたの今日のガチャが+1回ふえます。まちがえても解説が読めます。
      </p>
      <AiContentNotice>
        問題・選択肢・解説はAIが作成し、人が内容を確認したものです。まれに不正確な内容が含まれる場合があるため、参考情報としてご利用ください。
      </AiContentNotice>

      {status.question ? (
        <QuizPlayer
          key={status.question.id}
          question={status.question}
          answeredToday={status.answeredToday}
          dailyLimit={status.dailyLimit}
        />
      ) : (
        <div className="mt-6 rounded-xl bg-white p-6 text-center shadow-raised">
          <span aria-hidden="true" className="text-5xl">
            🎉
          </span>
          {status.answeredToday >= status.dailyLimit ? (
            <>
              <p className="mt-2 font-bold">今日のクイズはおしまいです</p>
              <p className="mt-1 text-sm text-gray-500">
                今日は{status.answeredToday}問中{status.correctToday}問 正解でした。また明日挑戦してください。
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-500">出題できる問題がまだ登録されていません。</p>
          )}
          <Link href="/game/gacha" className="mt-4 inline-block text-sm text-brand-700 hover:underline">
            今日のガチャを引く
          </Link>
        </div>
      )}
    </div>
  );
}
