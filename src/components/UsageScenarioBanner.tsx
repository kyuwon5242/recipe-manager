"use client";

import { useEffect, useState } from "react";

type ScenarioStep = { icon: string; label: string };
type Scenario = { caption: string; steps: ScenarioStep[] };

// 「1つの正解フロー」ではなく、状況に応じた使い方の例を複数見せるための
// シナリオ集。数秒ごとに自動で切り替わるバナーとして表示する。
const SCENARIOS: Scenario[] = [
  {
    caption: "作るものが決まっているときは",
    steps: [
      { icon: "🍳", label: "レシピを選ぶ" },
      { icon: "🧺", label: "献立トレイに集める" },
      { icon: "📝", label: "食材を確認する" },
      { icon: "🛒", label: "買い物リストが完成" },
    ],
  },
  {
    caption: "何を作るか迷ったときは",
    steps: [
      { icon: "✨", label: "AIに新レシピを提案してもらう" },
      { icon: "🧺", label: "気に入ったら献立トレイへ" },
      { icon: "🛒", label: "買い物リストが完成" },
    ],
  },
  {
    caption: "品目ごとにまとめて決めたいときは",
    steps: [
      { icon: "🍽️", label: "献立提案で品目ごとに考えてもらう" },
      { icon: "🧺", label: "献立トレイへ" },
      { icon: "🛒", label: "買い物リストが完成" },
    ],
  },
  {
    caption: "とにかく急いでいるときは",
    steps: [
      { icon: "🍳", label: "レシピを選ぶ" },
      { icon: "🛒", label: "今日はこれで買い物リストを作る" },
    ],
  },
];

const INTERVAL_MS = 5000;

export function UsageScenarioBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SCENARIOS.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const scenario = SCENARIOS[index];

  return (
    <div
      className="mt-4 rounded-xl bg-white p-4 shadow-raised"
      title="状況に応じた使い方の例です(数秒で切り替わります)"
    >
      <div key={index} style={{ animation: "banner-fade 0.4s ease" }}>
        <p className="text-xs font-semibold text-brand-700">{scenario.caption}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2">
          {scenario.steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2">
                <span aria-hidden="true" className="text-lg">
                  {step.icon}
                </span>
                <span className="text-xs font-medium text-gray-700">{step.label}</span>
              </div>
              {i < scenario.steps.length - 1 ? (
                <span aria-hidden="true" className="px-1 text-gray-300">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.caption}
            type="button"
            onClick={() => setIndex(i)}
            title={s.caption}
            aria-label={`${i + 1}番目の使い方を表示`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-brand-500" : "w-1.5 bg-gray-200 hover:bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
