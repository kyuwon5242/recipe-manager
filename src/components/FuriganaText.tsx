import { Fragment } from "react";

// 文中の「漢字{かんじ}」という記法をルビ(ふりがな)表示に変換する。
// 括弧()は元のテキスト側で「（大トロ）」のような注記として既に使われているため、
// ふりがな専用の記法として衝突しない{}を採用している。
export function FuriganaText({ text, className }: { text: string; className?: string }) {
  const parts: { key: number; kanji: string; reading: string | null }[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  const pattern = /([一-龥々]+)\{([ぁ-んー]+)\}/g;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ key: key++, kanji: text.slice(lastIndex, match.index), reading: null });
    }
    parts.push({ key: key++, kanji: match[1], reading: match[2] });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ key: key++, kanji: text.slice(lastIndex), reading: null });
  }

  return (
    <span className={className}>
      {parts.map((part) =>
        part.reading ? (
          <ruby key={part.key}>
            {part.kanji}
            <rt className="text-[0.6em] font-normal text-gray-400">{part.reading}</rt>
          </ruby>
        ) : (
          <Fragment key={part.key}>{part.kanji}</Fragment>
        )
      )}
    </span>
  );
}
