import type { SupabaseClient } from "@supabase/supabase-js";

// middleware(Edge)とServer Action/Route Handler(Node)の両方から呼べる
// よう、具体的なDatabase型には依存しない緩い型にしている。
type AnySupabaseClient = SupabaseClient;

export type LogLevel = "info" | "warn" | "error";

// 記録の失敗が本処理を止めないよう、呼び出し側でのtry/catchを不要にする
// (内部で握りつぶす)。
export async function logEvent(
  supabase: AnySupabaseClient,
  params: {
    level: LogLevel;
    event: string;
    message?: string | null;
    path?: string | null;
    userId?: string | null;
    familyId?: string | null;
    durationMs?: number | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  try {
    await supabase.from("app_logs").insert({
      level: params.level,
      event: params.event,
      message: params.message ?? null,
      path: params.path ?? null,
      user_id: params.userId ?? null,
      family_id: params.familyId ?? null,
      duration_ms: params.durationMs ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // ログ記録自体の失敗は無視する
  }
}

export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
