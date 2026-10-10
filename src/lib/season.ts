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

const SEASON_ICONS: { months: number[]; icon: string }[] = [
  { months: [3, 4, 5], icon: "🌸" },
  { months: [6, 7, 8], icon: "🍉" },
  { months: [9, 10, 11], icon: "🍁" },
  { months: [12, 1, 2], icon: "⛄" },
];

// ヘッダーのアプリアイコンを、月に応じた季節感のある絵文字に切り替える。
export function seasonalAppIcon(month: number = currentJstMonth()): string {
  return SEASON_ICONS.find((s) => s.months.includes(month))?.icon ?? "🍳";
}
