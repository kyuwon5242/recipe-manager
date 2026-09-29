// クイズの回答を送信してから結果が返るまでの待ち時間の演出。
// 買い物カートが棚を行き来する様子を見せることで、「採点中」であることを
// 楽しく伝える(単なるスピナーより、このアプリの「買い物」らしさに寄せた)。
// 画面は薄いグレーで覆い、下の選択肢が透けて見えても操作できないようにする。
export function QuizGradingOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-gray-100/90 backdrop-blur-[1px]"
      aria-live="polite"
    >
      <div className="relative h-10 w-32">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm tracking-[0.3em] opacity-40"
        >
          🥕 🍅 🥦 🧀
        </span>
        <span
          aria-hidden="true"
          className="quiz-grading-cart absolute left-1/2 top-1/2 -translate-y-1/2 text-3xl"
        >
          🛒
        </span>
      </div>
      <p className="text-sm font-bold text-gray-500">採点中…スーパーで確認中!</p>
    </div>
  );
}
