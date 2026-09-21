import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { formatDateTime } from "@/lib/format-date";

export const metadata = { title: "アプリログ" };

const LOG_LIMIT = 200;
const LEVELS = ["error", "warn", "info"] as const;

type LogRow = {
  id: string;
  level: string;
  event: string;
  message: string | null;
  path: string | null;
  duration_ms: number | null;
  created_at: string;
  profiles: { display_name: string | null; email: string | null } | null;
};

const LEVEL_STYLES: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-700",
  info: "bg-gray-100 text-gray-600",
};

export default async function AppLogsPage({
  searchParams,
}: PageProps<"/admin/logs">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const levelParam = Array.isArray(params.level) ? params.level[0] : params.level;
  const level = LEVELS.includes(levelParam as (typeof LEVELS)[number])
    ? (levelParam as (typeof LEVELS)[number])
    : null;

  let query = supabase
    .from("app_logs")
    .select("id, level, event, message, path, duration_ms, created_at, profiles(display_name, email)")
    .order("created_at", { ascending: false })
    .limit(LOG_LIMIT);

  if (level) {
    query = query.eq("level", level);
  }

  const { data: logs, error } = await query.returns<LogRow[]>();

  if (error) {
    throw new Error(`ログの取得に失敗しました: ${error.message}`);
  }

  const rows = logs ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">アプリログ</h1>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        直近{LOG_LIMIT}件まで表示。トレース・エラー調査・処理時間の目安に利用してください。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/logs"
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            level === null ? "bg-brand-600 text-white" : "border border-gray-300 text-gray-600"
          }`}
        >
          すべて
        </Link>
        {LEVELS.map((l) => (
          <Link
            key={l}
            href={`/admin/logs?level=${l}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              level === l ? "bg-brand-600 text-white" : "border border-gray-300 text-gray-600"
            }`}
          >
            {l}
          </Link>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-gray-400">該当するログがありません。</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLES[row.level] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {row.level}
                </span>
                <span className="font-medium">{row.event}</span>
                {row.duration_ms != null ? (
                  <span className="text-xs text-gray-400">{row.duration_ms}ms</span>
                ) : null}
                <span className="ml-auto text-xs text-gray-400">{formatDateTime(row.created_at)}</span>
              </div>
              {row.message ? <p className="mt-1 text-xs text-gray-600">{row.message}</p> : null}
              <p className="mt-1 text-xs text-gray-400">
                {row.path ?? "-"}
                {row.profiles ? ` ・ ${row.profiles.display_name ?? row.profiles.email}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
