// Server Action側(関数以外のエクスポートを許さない)からも通常のコンポーネント
// からも参照する定数はここに置く。
export const MAX_LISTS_PER_PERSON = 3;

export const SHOPPING_LIST_LIMIT_MESSAGE = `買い物リストは1人${MAX_LISTS_PER_PERSON}件までです。上書きする既存のリストを選ぶか、不要なリストを削除してください。`;
