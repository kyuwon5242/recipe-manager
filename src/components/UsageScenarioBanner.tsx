"use client";

import { useEffect, useRef, useState } from "react";

type ScenarioStep = { icon: string; label: string };
type ScenarioPrefix = { caption: string; steps: ScenarioStep[] };

// 献立トレイに集めた後の手順(トレイ→食材を確認→買い物リストが完成)は
// どの入口から来ても共通なので、末尾の固定ステップ(FIXED_STEPS)として
// 1本化し、気分に応じて変わる「入口」だけを数秒ごとに切り替える。
const PREFIXES: ScenarioPrefix[] = [
  {
    caption: "作るものが決まっているときは",
    steps: [{ icon: "🍳", label: "レシピ一覧・詳細から選ぶ" }],
  },
  {
    caption: "何を作るか迷ったときは",
    steps: [{ icon: "✨", label: "AIに新レシピを提案してもらう" }],
  },
  {
    caption: "献立を決めたいときは",
    steps: [{ icon: "🍽️", label: "献立提案で品目ごとに考えてもらう" }],
  },
];

const FIXED_STEPS: ScenarioStep[] = [
  { icon: "🧺", label: "献立トレイに集める" },
  { icon: "📝", label: "食材を確認する" },
  { icon: "🛒", label: "買い物リストが完成" },
];

const INTERVAL_MS = 5000;
const SCROLL_SETTLE_MS = 150;

export function UsageScenarioBanner() {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自動切り替え。ユーザーがスワイプ中・直後は自動切り替えを止める。
  useEffect(() => {
    const timer = setInterval(() => {
      if (isUserScrolling.current) return;
      setIndex((i) => (i + 1) % PREFIXES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // indexが変わったら(自動切り替え・ドットタップのどちらでも)該当スライドへスクロールする
  useEffect(() => {
    const el = scrollerRef.current;
    const slide = el?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [index]);

  // スマホでの横スワイプで止まった位置から、一番近いスライドをindexに反映する
  function handleScroll() {
    isUserScrolling.current = true;
    if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
    scrollSettleTimer.current = setTimeout(() => {
      isUserScrolling.current = false;
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const nearest = Math.round(el.scrollLeft / el.clientWidth);
      if (nearest >= 0 && nearest < PREFIXES.length) {
        setIndex(nearest);
      }
    }, SCROLL_SETTLE_MS);
  }

  return (
    <div
      className="mt-4 rounded-xl bg-white p-4 shadow-raised"
      title="状況に応じた入口の例です(数秒で切り替わります。横にスワイプしても切り替えられます)。献立トレイに集めた後の手順は共通です。"
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PREFIXES.map((prefix) => {
          const steps = [...prefix.steps, ...FIXED_STEPS];
          return (
            <div key={prefix.caption} className="w-full shrink-0 snap-start">
              <p className="text-xs font-semibold text-brand-700">{prefix.caption}</p>
              <div className="mt-2 flex flex-col items-stretch gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
                {steps.map((step, i) => {
                  const isFixed = i >= prefix.steps.length;
                  return (
                    <div
                      key={`${step.label}-${i}`}
                      className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-1"
                    >
                      <div
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                          isFixed ? "bg-brand-50" : "bg-paper"
                        }`}
                        title={isFixed ? "ここからは共通の手順です" : undefined}
                      >
                        <span aria-hidden="true" className="text-lg">
                          {step.icon}
                        </span>
                        <span className="text-xs font-medium text-gray-700">{step.label}</span>
                      </div>
                      {i < steps.length - 1 ? (
                        <span aria-hidden="true" className="flex justify-center text-gray-300 sm:px-1">
                          <span className="sm:hidden">↓</span>
                          <span className="hidden sm:inline">→</span>
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {PREFIXES.map((p, i) => (
          <button
            key={p.caption}
            type="button"
            onClick={() => setIndex(i)}
            title={p.caption}
            aria-label={`${i + 1}番目の入口を表示`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-brand-500" : "w-1.5 bg-gray-200 hover:bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
