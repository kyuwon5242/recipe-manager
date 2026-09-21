// Vercelが自動で注入するシステム環境変数からデプロイのバージョンを算出する。
// ローカル開発時(未設定)は毎回"dev"になり、強制ログアウトの対象外になる。
export function getAppVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 7) : "dev";
}

// BUILD_TIMEはnext.config.tsの env で、next build実行時(=デプロイのビルド時)
// に1回だけ評価されて埋め込まれる。表示用途のみで、バージョン判定には使わない。
export function getBuildTime(): string | null {
  const iso = process.env.BUILD_TIME;
  if (!iso) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
