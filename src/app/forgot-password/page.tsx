import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "パスワード再設定" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">パスワードをお忘れの方</h1>
      <p className="mt-2 text-sm text-gray-500">
        登録済みのメールアドレスを入力してください。パスワード再設定用のメールをお送りします。
      </p>

      <div className="mt-6">
        <ForgotPasswordForm />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-brand-700 hover:underline">
          ← ログイン画面に戻る
        </Link>
      </p>
    </div>
  );
}
