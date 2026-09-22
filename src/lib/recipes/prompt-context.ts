import { bucketGenre } from "@/lib/recipe-genre";

// AIへの提案系プロンプトに含めるレシピ件数の、品目(ジャンル)ごとの上限。
// レシピが増え続けても入力トークンが際限なく伸びないようにするための
// キャップ(件数はチューニング可能)。
export const RECIPES_PER_GENRE_LIMIT = 20;

// 品目ごとに上限件数までに絞り込む。呼び出し側は事前に「優先したい順」
// (お気に入り→更新日時が新しい順、など)に並べたレシピ配列を渡すこと。
export function selectRecipesForPrompt<T extends { genre: string | null }>(
  recipes: T[],
  perGenreLimit: number = RECIPES_PER_GENRE_LIMIT
): T[] {
  const counts = new Map<string, number>();
  const selected: T[] = [];
  for (const recipe of recipes) {
    const bucket = bucketGenre(recipe.genre);
    const count = counts.get(bucket) ?? 0;
    if (count >= perGenreLimit) continue;
    counts.set(bucket, count + 1);
    selected.push(recipe);
  }
  return selected;
}
