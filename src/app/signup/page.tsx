import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "新規登録" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">新規登録</h1>

      <div className="mt-6">
        <GoogleSignInButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        または
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        既にアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-emerald-700 hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
