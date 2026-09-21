// Vercelが自動で注入するシステム環境変数からデプロイのバージョンを算出する。
// ローカル開発時(未設定)は毎回"dev"になり、強制ログアウトの対象外になる。
export function getAppVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 7) : "dev";
}
