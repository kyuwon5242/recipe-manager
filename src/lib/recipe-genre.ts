export const GENRE_TABS = ["主食", "主菜", "副菜", "汁物", "その他"] as const;
export type GenreTab = (typeof GENRE_TABS)[number];

export function bucketGenre(genre: string | null): GenreTab {
  if (!genre) return "その他";
  const trimmed = genre.trim();
  if (!trimmed) return "その他";
  const exact = GENRE_TABS.find((g) => g !== "その他" && trimmed === g);
  if (exact) return exact;
  const partial = GENRE_TABS.find((g) => g !== "その他" && trimmed.includes(g));
  return partial ?? "その他";
}
