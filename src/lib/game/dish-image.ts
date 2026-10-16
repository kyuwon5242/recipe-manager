import fs from "node:fs";
import path from "node:path";

// 料理カード画像は public/dishes/ 配下に静的ファイルとして配置する想定
// (game-design.md 10章参照)。ファイル名はレシピタイトルと完全一致。
// 画像が未配置の料理は常にnullを返し、呼び出し側はシルエット表示に
// フォールバックする(段階的に画像を追加していく運用のため)。
// fsを使うためServer Componentからのみ呼び出すこと。
export function resolveDishImageSrc(title: string): string | null {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const fileName = `${title}${ext}`;
    try {
      if (fs.existsSync(path.join(process.cwd(), "public", "dishes", fileName))) {
        return `/dishes/${encodeURIComponent(fileName)}`;
      }
    } catch {
      // 読み取れない場合は次の候補へ
    }
  }
  return null;
}
