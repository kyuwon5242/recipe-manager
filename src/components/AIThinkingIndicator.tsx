import Image from "next/image";

// AI応答待ちであることが一目でわかるよう、マネージャーが考えながら
// メモ帳にペンを走らせている演出にする。単なるスピナーより、このアプリの
// マスコットらしい親しみやすさを出す狙い。
export function AIThinkingIndicator({
  label = "レシピマネージャーが考え中...",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
      <div className="relative h-10 w-11 shrink-0">
        <Image
          src="/manager-icon.png"
          alt=""
          width={36}
          height={36}
          className="absolute left-0 top-0 h-9 w-9 rounded-full object-cover"
          style={{ animation: "nod-think 1.6s ease-in-out infinite" }}
        />
        {/* メモ帳 */}
        <div className="absolute bottom-0 right-0 h-4 w-5 rounded-[2px] bg-white shadow ring-1 ring-brand-200">
          <div className="absolute left-0.5 right-1 top-1 h-px bg-brand-200" />
          <div className="absolute left-0.5 right-1.5 top-2 h-px bg-brand-200" />
          <div className="absolute left-0.5 right-2 top-3 h-px bg-brand-200" />
        </div>
        {/* ペン(左右に小刻みに動いて「書いている」様子を表す) */}
        <div
          className="absolute bottom-1.5 right-1 h-3 w-[3px] origin-bottom rounded-full bg-brand-700"
          style={{ animation: "pencil-write 0.5s ease-in-out infinite" }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}
