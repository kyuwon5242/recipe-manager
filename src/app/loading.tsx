import Image from "next/image";

// App Router標準のloading.tsx。ページ遷移でサーバー側のデータ取得を待つ間、
// Next.jsが自動的にこれを表示する(ボタン押下→遷移までのラグを埋める)。
export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-paper/80 backdrop-blur-sm">
      <Image
        src="/manager-icon.png"
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 rounded-full object-cover shadow-brand"
        style={{ animation: "nod-think 1.6s ease-in-out infinite" }}
      />
      <p className="text-sm font-medium text-gray-500">読み込み中...</p>
    </div>
  );
}
