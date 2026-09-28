import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { FuriganaText } from "@/components/FuriganaText";
import { QUIZ_CATEGORY_LABELS, QUIZ_DIFFICULTY_LABELS } from "@/lib/game/quiz";

export const metadata = { title: "クイズ問題一覧" };

type QuestionRow = {
  id: string;
  category: string;
  difficulty: string;
  question_text: string;
  choices: string[];
  correct_index: number;
  explanation_text: string;
  created_at: string;
  ingredients_master: { name: string } | null;
};

const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

// 問題の追加・修正はSQL(Supabase SQL Editor)で行う。この画面は問題文・選択肢・正解・
// 解説を確認するための参照専用(一般ユーザーには正解が見えないため、管理者だけが閲覧できる)。
export default async function AdminGameQuizPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id, category, difficulty, question_text, choices, correct_index, explanation_text, created_at, ingredients_master(name)")
    .order("created_at", { ascending: true })
    .returns<QuestionRow[]>();

  if (error) {
    throw new Error(`クイズ問題の取得に失敗しました: ${error.message}`);
  }

  const questions = data ?? [];
  const categories = [
    ...Object.keys(QUIZ_CATEGORY_LABELS),
    ...Array.from(new Set(questions.map((q) => q.category))).filter((c) => !(c in QUIZ_CATEGORY_LABELS)),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ZoneIcon zone="admin" icon="❓" />
        <h1 className="text-2xl font-bold">クイズ問題一覧</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        登録済みのクイズ問題({questions.length}問)の問題文・選択肢・正解・解説を確認できます。追加・修正はSupabase SQL Editorで行います(この画面は参照のみ。問題IDで対象を指定できます)。
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
        {categories.map((c) => {
          const count = questions.filter((q) => q.category === c).length;
          return (
            <a key={c} href={`#category-${c}`} className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200">
              {QUIZ_CATEGORY_LABELS[c] ?? c} {count}問
            </a>
          );
        })}
      </div>

      <div className="mt-6 space-y-8">
        {categories.map((category) => {
          const list = questions
            .filter((q) => q.category === category)
            .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty));
          if (list.length === 0) return null;
          return (
            <section key={category} id={`category-${category}`}>
              <h2 className="text-sm font-bold text-gray-700">
                {QUIZ_CATEGORY_LABELS[category] ?? category}({list.length}問)
              </h2>
              <ul className="mt-2 space-y-3">
                {list.map((q) => (
                  <li key={q.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-raised">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">
                        {QUIZ_DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                      </span>
                      {q.ingredients_master ? (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800">
                          関連食材: {q.ingredients_master.name}
                        </span>
                      ) : null}
                    </div>
                    <FuriganaText text={q.question_text} className="mt-2 block text-sm font-bold" />
                    <ol className="mt-2 space-y-1 text-sm">
                      {q.choices.map((choice, index) => {
                        const isCorrect = index === q.correct_index;
                        return (
                          <li
                            key={index}
                            className={`flex gap-2 rounded px-2 py-1 ${isCorrect ? "bg-green-50 font-medium text-green-800" : "text-gray-600"}`}
                          >
                            <span aria-hidden="true">{String.fromCharCode(65 + index)}.</span>
                            <span className="flex-1">{choice}</span>
                            {isCorrect ? <span>⭕ 正解</span> : null}
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="font-bold">解説:</span> {q.explanation_text}
                    </p>
                    <p className="mt-2 break-all font-mono text-[10px] text-gray-400">id: {q.id}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {questions.length === 0 ? <p className="text-sm text-gray-400">まだ問題が登録されていません。</p> : null}
      </div>
    </div>
  );
}
