import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { LoginForm } from "@/components/LoginForm";
import { getAppVersion, getBuildTime } from "@/lib/version";

export const metadata = { title: "ログイン" };

const ERROR_MESSAGES: Record<string, string> = {
  auth: "ログインに失敗しました。もう一度お試しください。",
  updated: "アプリが更新されました。お手数ですが、もう一度ログインしてください。",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const reasonParam = params.reason ?? params.error;
  const reason = Array.isArray(reasonParam) ? reasonParam[0] : reasonParam;
  const message = reason ? ERROR_MESSAGES[reason] : null;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">ログイン</h1>

      {message ? (
        <p className="mt-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">{message}</p>
      ) : null}

      <div className="mt-6">
        <GoogleSignInButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        または
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <LoginForm />

      <p className="mt-3 text-center text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          パスワードをお忘れですか?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-gray-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-brand-700 hover:underline">
          新規登録
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <p className="mt-4 text-center text-xs">
          <Link href="/api/dev-login" className="text-gray-400 hover:underline">
            🧪 開発用: テストアカウントでログイン
          </Link>
        </p>
      ) : null}

      <p className="mt-10 text-center text-xs text-gray-300">
        version {getAppVersion()}
        {getBuildTime() ? ` ・ ビルド: ${getBuildTime()}` : ""}
      </p>
    </div>
  );
}
