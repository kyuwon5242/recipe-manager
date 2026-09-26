import { needsFurigana } from "@/lib/game/cards";

// 漢字を含む食材名だけルビ(ふりがな)を添える。ひらがな・カタカナのみの
// 名前はそのまま表示する(読みが自明なため)。
export function FuriganaName({
  name,
  reading,
  className,
}: {
  name: string;
  reading: string | null;
  className?: string;
}) {
  if (needsFurigana(name, reading)) {
    return (
      <ruby className={className}>
        {name}
        <rt className="text-[0.6em] font-normal text-gray-400">{reading}</rt>
      </ruby>
    );
  }
  return <span className={className}>{name}</span>;
}
