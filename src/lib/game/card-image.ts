import fs from "node:fs";
import path from "node:path";

// カード画像は public/cards/ 配下に静的ファイルとして配置する想定
// (game-design.md 8章参照)。イラスト未設定・ファイル未配置(admin/game-cardsで
// ファイル名だけ先に登録した場合を含む)は常にnullを返し、呼び出し側は
// プレースホルダー表示にフォールバックする(壊れた画像アイコンを出さないため)。
// fsを使うためServer Componentからのみ呼び出すこと。
export function resolveCardImageSrc(illustrationUrl: string | null): string | null {
  if (!illustrationUrl) return null;

  const filePath = path.join(process.cwd(), "public", "cards", illustrationUrl);
  try {
    if (!fs.existsSync(filePath)) return null;
  } catch {
    return null;
  }
  return `/cards/${illustrationUrl}`;
}
