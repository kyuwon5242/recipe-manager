import fs from "node:fs";
import path from "node:path";

// カード画像は public/cards/ 配下に静的ファイルとして配置する想定
// (game-design.md 8章参照)。イラスト未設定・ファイル未配置(admin/game-cardsで
// ファイル名だけ先に登録した場合を含む)は常にnullを返し、呼び出し側は
// プレースホルダー表示にフォールバックする(壊れた画像アイコンを出さないため)。
// fsを使うためServer Componentからのみ呼び出すこと。
export function resolveCardImageSrc(illustrationUrl: string | null): string | null {
  if (!illustrationUrl) return null;

  // 登録名(食材名.png)のファイルが無ければ、同名で拡張子違いのファイル
  // (事前配置のサンプルが.jpgの場合など)を探す。
  const ext = path.extname(illustrationUrl);
  const base = illustrationUrl.slice(0, illustrationUrl.length - ext.length);
  const candidates = new Set([illustrationUrl, ...[".png", ".jpg", ".jpeg", ".webp"].map((e) => base + e)]);

  for (const fileName of candidates) {
    try {
      if (fs.existsSync(path.join(process.cwd(), "public", "cards", fileName))) {
        return `/cards/${fileName}`;
      }
    } catch {
      // 読み取れない場合は次の候補へ
    }
  }
  return null;
}
