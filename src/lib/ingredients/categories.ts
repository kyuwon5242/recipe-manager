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
