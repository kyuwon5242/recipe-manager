import type { SupabaseClient } from "@supabase/supabase-js";

// クイズの共通定義。問題の抽選・正解の判定・ボーナス付与はすべてDB関数
// (get_next_quiz / answer_quiz)側で行う。正解の位置は画面側に渡らない。

export const QUIZ_CATEGORY_LABELS: Record<string, string> = {
  nutrition: "栄養素",
  season: "旬",
  origin: "産地・由来",
  storage: "保存方法",
  cooking: "調理・豆知識",
};

export const QUIZ_DIFFICULTY_LABELS: Record<string, string> = {
  easy: "かんたん",
  normal: "ふつう",
  hard: "むずかしい",
};

export type QuizQuestion = {
  id: string;
  category: string;
  difficulty: string;
  text: string;
  choices: string[];
};

// 今日の状況(本人の回答数)と、次の問題(上限に達した・出題できる問題が無い場合はnull)
export type QuizStatus = {
  answeredToday: number;
  correctToday: number;
  dailyLimit: number;
  question: QuizQuestion | null;
};

type NextQuizRow = {
  answered_today: number;
  correct_today: number;
  daily_limit: number;
  next_question_id: string | null;
  next_category: string | null;
  next_difficulty: string | null;
  next_question_text: string | null;
  next_choices: string[] | null;
};

export async function getQuizStatus(supabase: SupabaseClient): Promise<QuizStatus> {
  const { data, error } = await supabase.rpc("get_next_quiz").maybeSingle<NextQuizRow>();

  if (error || !data) {
    throw new Error(`クイズの取得に失敗しました: ${error?.message ?? "データがありません"}`);
  }

  const hasQuestion = data.next_question_id && data.next_question_text && data.next_choices;

  return {
    answeredToday: data.answered_today,
    correctToday: data.correct_today,
    dailyLimit: data.daily_limit,
    question: hasQuestion
      ? {
          id: data.next_question_id as string,
          category: data.next_category ?? "",
          difficulty: data.next_difficulty ?? "",
          text: data.next_question_text as string,
          choices: data.next_choices as string[],
        }
      : null,
  };
}
