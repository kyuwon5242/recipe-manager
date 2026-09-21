import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { MenuAgentChat } from "@/components/MenuAgentChat";

export const metadata = { title: "献立エージェント" };

export default async function MenuAgentPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="ai" icon="✨" title="献立エージェント" />
        <div>
          <h1 className="text-xl font-bold">献立エージェント</h1>
          <p className="text-xs text-gray-400">実験・管理者限定</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        会話しながら献立を決め、食材を確認し、買い物リストの作成まで進められます。
      </p>

      <div className="mt-6">
        <MenuAgentChat />
      </div>
    </div>
  );
}
