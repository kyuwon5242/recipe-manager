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

// ヘッダーのアイコン自体は変えず、背景色だけで季節感を出す。-50は白との
// 差がほぼ視認できなかったため、ZONES(src/lib/zones.ts)のゾーン色と同じ
// 濃さの-100を、ヘッダー全体に均一に敷く(グラデーションで端に寄せると
// 画面幅によっては見えなくなるため、フェードさせず一色で塗る)。
const SEASON_HEADER_CLASSES: { months: number[]; className: string }[] = [
  { months: [3, 4, 5], className: "bg-pink-100" }, // 桜
  { months: [6, 7, 8], className: "bg-sky-100" }, // 夏空
  { months: [9, 10, 11], className: "bg-orange-100" }, // 紅葉
  { months: [12, 1, 2], className: "bg-blue-100" }, // 冬
];

export function seasonalHeaderClass(month: number = currentJstMonth()): string {
  return SEASON_HEADER_CLASSES.find((s) => s.months.includes(month))?.className ?? "bg-white";
}
