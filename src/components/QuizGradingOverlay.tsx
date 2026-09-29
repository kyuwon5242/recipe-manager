// クイズの回答を送信してから結果が返るまでの待ち時間の演出。
// 虫眼鏡が答案用紙の上を行き来する様子で「採点中」であることを伝える
// (以前は買い物カートの演出だったが、クイズの結果待ちという文脈に合わないため変更)。
// 画面は薄いグレーで覆い、下の選択肢が透けて見えても操作できないようにする。
export function QuizGradingOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-gray-100/90 backdrop-blur-[1px]"
      aria-live="polite"
    >
      <div className="relative flex h-10 w-24 items-center justify-center">
        <span aria-hidden="true" className="text-3xl">
          📝
        </span>
        <span aria-hidden="true" className="quiz-grading-glass absolute text-2xl">
          🔍
        </span>
      </div>
      <p className="text-sm font-bold text-gray-500">採点中…</p>
    </div>
  );
}
