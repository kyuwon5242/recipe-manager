// ゲーム要素(食材図鑑・ガチャ・クイズ・料理作成)だけ、他機能とは違う
// 「まな板の上で遊ぶ」ような雰囲気の背景にする(/game配下すべてに適用)。
// 見た目の提案用の第一弾(ユーザー確認待ち)。
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <div className="game-zone min-h-screen">{children}</div>;
}
