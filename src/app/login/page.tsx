import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">ログイン</h1>

      <div className="mt-6">
        <GoogleSignInButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        または
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-emerald-700 hover:underline">
          新規登録
        </Link>
      </p>
    </div>
  );
}
