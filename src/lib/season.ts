// 季節判定(旬の食材表示・アプリアイコンの季節感演出で共通利用)。
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

// ヘッダーのアイコン自体は変えず、背景の淡いグラデーションだけで季節感を出す。
const SEASON_HEADER_CLASSES: { months: number[]; className: string }[] = [
  { months: [3, 4, 5], className: "bg-gradient-to-r from-pink-50 via-white to-white" }, // 桜
  { months: [6, 7, 8], className: "bg-gradient-to-r from-sky-50 via-white to-white" }, // 夏空
  { months: [9, 10, 11], className: "bg-gradient-to-r from-orange-50 via-white to-white" }, // 紅葉
  { months: [12, 1, 2], className: "bg-gradient-to-r from-blue-50 via-white to-white" }, // 冬
];

export function seasonalHeaderClass(month: number = currentJstMonth()): string {
  return SEASON_HEADER_CLASSES.find((s) => s.months.includes(month))?.className ?? "bg-white";
}
