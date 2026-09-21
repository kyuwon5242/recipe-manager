import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppVersion } from "@/lib/version";

const PUBLIC_PATHS = ["/login", "/signup", "/suspended"];
const APP_VERSION_COOKIE = "app_version";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
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
  const isPublicPath = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/callback");

  // 新しいバージョンがデプロイされた後も古いクライアントで操作を続けられて
  // しまわないよう、ログイン中にバージョンが変わっていたら一度サインアウト
  // させ、ログイン画面からやり直してもらう(is_suspendedのチェックと同じ設計)。
  const currentVersion = getAppVersion();
  const cookieVersion = request.cookies.get(APP_VERSION_COOKIE)?.value;
  const versionChanged = Boolean(cookieVersion) && cookieVersion !== currentVersion;

  if (user && versionChanged && pathname !== "/login") {
    await supabase.auth.signOut();
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

    if (pathname !== "/family/setup" && pathname !== "/suspended") {
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

  // Important: return supabaseResponse as-is so the refreshed auth cookies propagate.
  return supabaseResponse;
}
