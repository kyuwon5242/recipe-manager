"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";

export type QuizAnswerResult = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  relatedCardId: string | null;
  bonusGranted: boolean;
  answeredToday: number;
  dailyLimit: number;
};

export type QuizAnswerState = {
  error: string | null;
  result: QuizAnswerResult | null;
};

type AnswerRow = {
  result_is_correct: boolean;
  result_correct_index: number;
  result_explanation: string;
  result_related_card_id: string | null;
  result_bonus_granted: boolean;
  result_answered_today: number;
  result_daily_limit: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  quiz_daily_limit: "今日のクイズはおしまいです。また明日挑戦できます。",
  quiz_already_answered: "この問題には今日すでに答えています。",
  quiz_not_found: "問題が見つかりませんでした。",
  quiz_invalid_choice: "選択肢が正しくありません。",
};

export async function answerQuiz(_prevState: QuizAnswerState, formData: FormData): Promise<QuizAnswerState> {
  const questionId = String(formData.get("question_id") ?? "");
  const selectedIndex = Number(formData.get("selected_index"));

  if (!questionId || !Number.isInteger(selectedIndex)) {
    return { error: "回答を送信できませんでした。", result: null };
  }

  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();

  const { data, error } = await supabase
    .rpc("answer_quiz", {
      p_family_id: familyId,
      p_question_id: questionId,
      p_selected_index: selectedIndex,
    })
    .maybeSingle<AnswerRow>();

  if (error) {
    const known = Object.entries(ERROR_MESSAGES).find(([code]) => error.message.includes(code));
    return { error: known ? known[1] : `回答に失敗しました: ${error.message}`, result: null };
  }
  if (!data) {
    return { error: "回答の結果を取得できませんでした。", result: null };
  }

  return {
    error: null,
    result: {
      questionId,
      selectedIndex,
      isCorrect: data.result_is_correct,
      correctIndex: data.result_correct_index,
      explanation: data.result_explanation,
      relatedCardId: data.result_related_card_id,
      bonusGranted: data.result_bonus_granted,
      answeredToday: data.result_answered_today,
      dailyLimit: data.result_daily_limit,
    },
  };
}
