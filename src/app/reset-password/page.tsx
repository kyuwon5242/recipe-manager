import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "パスワード再設定" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">新しいパスワードを設定</h1>
      <p className="mt-2 text-sm text-gray-500">
        メールのリンクからこの画面に進みました。新しいパスワードを入力してください。
      </p>

      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
