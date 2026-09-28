// AIが生成した内容(クイズの問題・解説、カードの豆知識、レシピ提案など)を
// 表示する画面に添える注意書き。内容の正確性を保証しないことを明示する。
// 2026-09-29、クイズ画面への追加を機に、AI関連機能全体へ横展開した。
export function AiContentNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      ⚠️ {children}
    </p>
  );
}
