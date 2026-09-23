import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppVersion } from "@/lib/version";
import { logEvent, startTimer } from "@/lib/logging/log";

const PUBLIC_PATHS = ["/login", "/signup", "/suspended", "/forgot-password"];
// 開発環境専用のテストアカウント自動ログイン(/api/dev-login自体で
// NODE_ENV===productionなら404にする)。ログイン中かどうかに関わらず常に
// 素通りさせ、テストアカウントへの切り替えをサインアウト無しで行えるようにする。
const DEV_LOGIN_PATH = "/api/dev-login";
const APP_VERSION_COOKIE = "app_version";
// これを超えた処理時間のリクエストは、遅延調査用にapp_logsへ記録する。
// Vercel無料プランのRuntime Logsは1時間しか残らないため、これで補う。
const SLOW_REQUEST_MS = 1500;

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const stopTimer = startTimer();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run other code between createServerClient and auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (pathname === DEV_LOGIN_PATH) {
    return supabaseResponse;
  }
  const isPublicPath = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/callback");

  // 新しいバージョンがデプロイされた後も古いクライアントで操作を続けられて
  // しまわないよう、ログイン中にバージョンが変わっていたら一度サインアウト
  // させ、ログイン画面からやり直してもらう(is_suspendedのチェックと同じ設計)。
  const currentVersion = getAppVersion();
  const cookieVersion = request.cookies.get(APP_VERSION_COOKIE)?.value;
  const versionChanged = Boolean(cookieVersion) && cookieVersion !== currentVersion;

  if (user && versionChanged && pathname !== "/login") {
    await supabase.auth.signOut();
    await logEvent(supabase, {
      level: "warn",
      event: "forced_signout_version_change",
      path: pathname,
      userId: user.id,
      metadata: { fromVersion: cookieVersion, toVersion: currentVersion },
    });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "updated");
    const response = NextResponse.redirect(url);
    response.cookies.set(APP_VERSION_COOKIE, currentVersion, { path: "/" });
    return response;
  }

  if (!cookieVersion || versionChanged) {
    supabaseResponse.cookies.set(APP_VERSION_COOKIE, currentVersion, { path: "/" });
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    if (pathname !== "/suspended") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_suspended")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        await logEvent(supabase, {
          level: "warn",
          event: "suspended_user_access_blocked",
          path: pathname,
          userId: user.id,
        });
        const url = request.nextUrl.clone();
        url.pathname = "/suspended";
        return NextResponse.redirect(url);
      }
    }

    if (isPublicPath && pathname !== "/suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (pathname !== "/family/setup" && pathname !== "/suspended" && pathname !== "/reset-password") {
      const { data: membership } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        const url = request.nextUrl.clone();
        url.pathname = "/family/setup";
        return NextResponse.redirect(url);
      }
    }
  }

  const durationMs = stopTimer();
  if (durationMs > SLOW_REQUEST_MS) {
    await logEvent(supabase, {
      level: "warn",
      event: "slow_request",
      path: pathname,
      userId: user?.id ?? null,
      durationMs,
    });
  }

  // Important: return supabaseResponse as-is so the refreshed auth cookies propagate.
  return supabaseResponse;
}
