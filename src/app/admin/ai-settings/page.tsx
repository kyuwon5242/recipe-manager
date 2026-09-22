import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { AiSettingsForm } from "@/components/AiSettingsForm";
import { getAiModelSettings } from "@/lib/ai-usage/model-settings";

export const metadata = { title: "AIモデル設定" };

export default async function AiSettingsPage() {
  const { supabase } = await requireAdmin();
  const settings = await getAiModelSettings(supabase);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">AIモデル設定</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        機能ごとに使用するAIモデルをアプリ全体で切り替えられます(家族単位の設定ではありません)。Haiku
        4.5はOpus 5よりコストが大幅に低い一方、提案内容が簡潔になる傾向があります。実際の出力を確認しながら選んでください。
      </p>
      <AiSettingsForm settings={settings} />
    </div>
  );
}
