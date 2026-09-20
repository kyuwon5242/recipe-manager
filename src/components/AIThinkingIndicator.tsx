// AI応答待ちであることが一目でわかるよう、動きのある「調理中」表示にする。
// 単なるスピナーより、このアプリらしい親しみやすさを出す狙い。
export function AIThinkingIndicator({ label = "AIがレシピを考え中..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
      <div className="relative h-8 w-8 shrink-0">
        <span
          className="absolute inset-0 flex items-center justify-center text-2xl"
          style={{ animation: "bounce-pot 1s ease-in-out infinite" }}
        >
          🍳
        </span>
        <span
          className="absolute -top-1 left-1 h-1.5 w-1.5 rounded-full bg-brand-300"
          style={{ animation: "steam-rise 1.2s ease-out infinite" }}
        />
        <span
          className="absolute -top-1 left-4 h-1.5 w-1.5 rounded-full bg-brand-300"
          style={{ animation: "steam-rise 1.2s ease-out infinite 0.4s" }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}
