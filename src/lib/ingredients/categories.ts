// スーパーの売り場構成に合わせた食材カテゴリ。食材マスタの分類(AIによる
// 自動付与・一括整理)と、食材リスト画面の表示・並び替えの両方で共通利用する。
export const INGREDIENT_CATEGORIES = [
  "野菜・果物",
  "肉",
  "魚介",
  "卵・乳製品",
  "豆腐・大豆製品",
  "米・パン・麺",
  "調味料・油",
  "粉類・乾物・缶詰",
  "冷凍食品",
  "その他",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

// まだ分類(AIによるカテゴリ付与)が行われていない食材に使う表示上のラベル。
// AIが判断した上での「その他」とは区別する。
export const UNCATEGORIZED_LABEL = "未分類";

// カテゴリ見出しの隣に添える絵文字(食材リスト・買い物リスト画面共通)。
const CATEGORY_ICONS: Record<string, string> = {
  "野菜・果物": "🥬",
  肉: "🥩",
  魚介: "🐟",
  "卵・乳製品": "🥚",
  "豆腐・大豆製品": "🫘",
  "米・パン・麺": "🍚",
  "調味料・油": "🧂",
  "粉類・乾物・缶詰": "🥫",
  冷凍食品: "🧊",
  その他: "🛒",
  [UNCATEGORIZED_LABEL]: "❓",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.その他;
}

// スーパーの売り場順(このリストの並び)に食材を並べ替えるための比較関数。
// 未分類や想定外のカテゴリ文字列は末尾に回す。
export function categoryRank(category: string, order: readonly string[] = INGREDIENT_CATEGORIES): number {
  const index = order.indexOf(category);
  return index === -1 ? order.length : index;
}

// orderを省略した場合は既定の10分類の順で並べる。familyのよく使うスーパー
// (family_stores.category_order)が指定された場合はその順を使う。
export function sortByCategoryOrder<T extends { category: string }>(
  items: T[],
  order: readonly string[] = INGREDIENT_CATEGORIES
): T[] {
  return [...items].sort((a, b) => categoryRank(a.category, order) - categoryRank(b.category, order));
}
