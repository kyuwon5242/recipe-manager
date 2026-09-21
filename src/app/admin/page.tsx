import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "管理者ダッシュボード" };

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
      </div>
      <ul className="mt-6 space-y-3">
        <li>
          <Link
            href="/admin/recipes"
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-raised transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="font-semibold">全レシピの参照・編集</p>
            <p className="mt-1 text-sm text-gray-500">家族を問わず全レシピを確認・編集できます。</p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/users"
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-raised transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="font-semibold">ユーザー管理</p>
            <p className="mt-1 text-sm text-gray-500">
              全ユーザーの一覧・表示名の編集・利用停止ができます。
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/ai-usage"
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-raised transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="font-semibold">AI利用量</p>
            <p className="mt-1 text-sm text-gray-500">
              ユーザー別・機能別のトークン使用量と概算コストを確認できます。
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/logs"
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-raised transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="font-semibold">アプリログ</p>
            <p className="mt-1 text-sm text-gray-500">
              エラー・警告・処理時間のトレースを確認できます。
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/menu-agent"
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-raised transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="font-semibold">✨ 献立エージェント(実験)</p>
            <p className="mt-1 text-sm text-gray-500">
              会話しながら献立を決め、買い物リストの作成まで進められます。
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
