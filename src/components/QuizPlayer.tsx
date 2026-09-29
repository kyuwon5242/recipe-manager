"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { answerQuiz, type QuizAnswerState } from "@/app/game/quiz/actions";
import { FuriganaText } from "@/components/FuriganaText";
import { QuizGradingOverlay } from "@/components/QuizGradingOverlay";
import {
  QUIZ_CATEGORY_LABELS,
  QUIZ_DIFFICULTY_LABELS,
  type QuizQuestion,
} from "@/lib/game/quiz";

const initialState: QuizAnswerState = { error: null, result: null };

// 1問分の出題・解答・解説。次の問題はページを取り直して(router.refresh)表示する。
// 親側で key={question.id} を付け、問題が変わるたびに状態をリセットする。
export function QuizPlayer({
  question,
  answeredToday,
  dailyLimit,
}: {
  question: QuizQuestion;
  answeredToday: number;
  dailyLimit: number;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(answerQuiz, initialState);
  const result = state.result;

  return (
    <div className="relative mt-6 rounded-xl bg-white p-5 shadow-raised">
      {isPending ? <QuizGradingOverlay /> : null}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-2 py-0.5">{QUIZ_CATEGORY_LABELS[question.category] ?? question.category}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5">
          {QUIZ_DIFFICULTY_LABELS[question.difficulty] ?? question.difficulty}
        </span>
        <span className="ml-auto">
          {(result ? result.answeredToday : answeredToday + 1)} / {dailyLimit} 問目
        </span>
      </div>

      <FuriganaText text={question.text} className="mt-3 block text-base font-bold leading-relaxed" />

      <form action={formAction} className="mt-4 space-y-2">
        <input type="hidden" name="question_id" value={question.id} />
        {question.choices.map((choice, index) => {
          const isSelected = result?.selectedIndex === index;
          const isCorrectChoice = result?.correctIndex === index;
          let style = "border-gray-200 bg-white hover:border-brand-500 hover:bg-brand-50";
          if (result) {
            if (isCorrectChoice) style = "border-green-500 bg-green-50 text-green-800";
            else if (isSelected) style = "border-red-400 bg-red-50 text-red-700";
            else style = "border-gray-200 bg-white text-gray-400";
          }
          return (
            <button
              key={index}
              type="submit"
              name="selected_index"
              value={index}
              disabled={isPending || result !== null}
              className={`flex w-full items-start gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition active:scale-[0.99] disabled:cursor-default ${style}`}
            >
              <span aria-hidden="true" className="font-bold">
                {String.fromCharCode(65 + index)}
              </span>
              <FuriganaText text={choice} className="flex-1" />
              {result && isCorrectChoice ? <span aria-label="正解">⭕</span> : null}
              {result && isSelected && !isCorrectChoice ? <span aria-label="不正解">❌</span> : null}
            </button>
          );
        })}
      </form>

      {state.error ? <p className="mt-3 text-sm text-red-600">{state.error}</p> : null}

      {result ? (
        <div className="mt-4">
          <p className={`text-lg font-bold ${result.isCorrect ? "text-green-700" : "text-red-600"}`}>
            {result.isCorrect ? "せいかい!" : "ざんねん…"}
          </p>
          {result.bonusGranted ? (
            <p className="mt-1 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">
              🎁 今日の{result.dailyLimit}問すべて正解!家族の今日のガチャが +1回 ふえました!
            </p>
          ) : null}
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-500">かいせつ</p>
            <FuriganaText text={result.explanation} className="mt-1 block text-sm leading-relaxed text-gray-700" />
          </div>
          {result.relatedCardId ? (
            <Link
              href={`/game/cards/${result.relatedCardId}`}
              className="mt-3 inline-block text-sm text-brand-700 hover:underline"
            >
              この食材のカードを見る →
            </Link>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {result.answeredToday < result.dailyLimit ? (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95"
              >
                次の問題へ
              </button>
            ) : (
              <p className="text-sm text-gray-500">今日のクイズはおしまいです。また明日!</p>
            )}
            <Link href="/game/gacha" className="text-sm text-brand-700 hover:underline">
              ガチャを引く
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
