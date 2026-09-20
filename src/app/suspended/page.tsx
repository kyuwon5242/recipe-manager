import Link from "next/link";

export const metadata = { title: "利用停止中" };

export default function SuspendedPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-bold">このアカウントは利用停止されています</h1>
      <p className="mt-2 text-sm text-gray-500">
        心当たりがない場合は、家族の管理者にお問い合わせください。
      </p>
      <Link href="/login" className="mt-6 inline-block text-sm text-brand-700 hover:underline">
        ログイン画面に戻る
      </Link>
    </div>
  );
}
