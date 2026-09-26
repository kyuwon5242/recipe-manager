import { categoryIcon } from "@/lib/ingredients/categories";
import {
  categoryCardHue,
  monthsLabel,
  rarityStars,
  RARITY_CARD_CLASSES,
  RARITY_CODES,
  type CardRarity,
} from "@/lib/game/cards";
import { FuriganaName } from "@/components/FuriganaName";

const SPARKLE_POSITIONS: [number, number][] = [
  [14, 20],
  [80, 14],
  [86, 54],
  [10, 62],
  [68, 86],
  [32, 90],
];

// 長い食材名は名前板に収まるよう文字サイズを段階的に小さくする。
function nameFontSize(name: string): string | undefined {
  const length = Array.from(name).length;
  if (length <= 6) return undefined;
  if (length <= 8) return "6.4cqw";
  if (length <= 10) return "5.4cqw";
  return "4.6cqw";
}

// 食材図鑑カード(一覧・詳細・管理画面で共通利用)。縦長のカード1枚として
// 名前・★・イラスト・旬・レアリティ略称までを描く。
// - 縁取り・背景 = カテゴリの色相。レアリティが上がるほど濃くなる
// - SR以上は白い光が走り、レジェンドのみ虹色ホロ・きらめき・脈打つ光彩が付く
// 未入手時はカテゴリ・レアリティに関わらずグレー(彩度0)のカードで統一する。
// compact=true は管理画面用の縮小表示(名前・フッターを出さない)。
export function GameCardVisual({
  category,
  rarity,
  src,
  name,
  reading,
  seasonMonths,
  isOwned,
  iconClassName,
  compact,
}: {
  category: string;
  rarity: CardRarity;
  src: string | null;
  name: string;
  reading?: string | null;
  seasonMonths?: number[] | null;
  isOwned: boolean;
  iconClassName?: string;
  compact?: boolean;
}) {
  const { h, k } = isOwned ? categoryCardHue(category) : { h: 0, k: 0 };
  const rarityClass = isOwned ? RARITY_CARD_CLASSES[rarity] : RARITY_CARD_CLASSES.normal;

  return (
    <div className="game-card" data-compact={compact ? "" : undefined}>
      <div className={`game-card-frame ${rarityClass}`} style={{ "--h": h, "--k": k } as React.CSSProperties}>
        <div className="game-card-inner">
          <div className="game-card-plate">
            <span style={isOwned ? { fontSize: nameFontSize(name) } : undefined}>
              {isOwned ? <FuriganaName name={name} reading={reading ?? null} /> : "？？？"}
            </span>
            {isOwned ? <span className="game-card-stars">{rarityStars(rarity)}</span> : null}
          </div>
          <div className="game-card-art" style={isOwned ? undefined : { background: "#9ca3af" }}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={name} />
            ) : (
              <span aria-hidden="true" className={iconClassName ?? "text-3xl"}>
                {categoryIcon(category)}
              </span>
            )}
          </div>
          <div className="game-card-foot">
            <span>旬: {monthsLabel(seasonMonths ?? null)}</span>
            {isOwned ? <span className="game-card-chip">{RARITY_CODES[rarity]}</span> : null}
          </div>
          {isOwned && rarity === "legendary"
            ? SPARKLE_POSITIONS.map(([left, top], i) => (
                <i
                  key={i}
                  aria-hidden="true"
                  className="game-card-sparkle"
                  style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.35}s` }}
                >
                  ✦
                </i>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
