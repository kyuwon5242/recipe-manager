// 季節判定(旬の食材表示・ヘッダーの季節演出で共通利用)。
// サーバーの実行環境のタイムゾーンに依存しないよう、常に日本時間基準で月を取得する。
export function currentJstMonth(date: Date = new Date()): number {
  const jstMonth = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
  }).format(date);
  return Number(jstMonth);
}

export function isInSeasonMonth(months: number[] | null | undefined, month: number): boolean {
  return Boolean(months && months.includes(month));
}

export type Season = "spring" | "summer" | "autumn" | "winter";

const SEASON_MONTHS: Record<Season, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
};

export function currentSeason(month: number = currentJstMonth()): Season {
  return (
    (Object.keys(SEASON_MONTHS) as Season[]).find((season) => SEASON_MONTHS[season].includes(month)) ?? "autumn"
  );
}

// ヘッダーのアイコン自体は変えず、背景色だけで季節感を出す。-50は白との
// 差がほぼ視認できなかったため、ZONES(src/lib/zones.ts)のゾーン色と同じ
// 濃さの-100を、ヘッダー全体に均一に敷く(グラデーションで端に寄せると
// 画面幅によっては見えなくなるため、フェードさせず一色で塗る)。
const SEASON_HEADER_CLASSES: Record<Season, string> = {
  spring: "bg-pink-100", // 桜
  summer: "bg-sky-100", // 夏空
  autumn: "bg-orange-100", // 紅葉
  winter: "bg-blue-100", // 冬
};

export function seasonalHeaderClass(month?: number): string {
  return SEASON_HEADER_CLASSES[currentSeason(month)];
}
