import { requireMenuAgentAccess } from "@/lib/admin/current";
import { getCurrentFamilyId } from "@/lib/family/current";
import { getFamilyStores } from "@/lib/shopping/defaults";
import { ZoneIcon } from "@/components/ZoneIcon";
import { MenuAgentChat } from "@/components/MenuAgentChat";
import { HelpPanel } from "@/components/HelpPanel";
import { AiQuotaGauge } from "@/components/AiQuotaGauge";
import { getAiQuotaStatus } from "@/lib/ai-usage/quota";

export const metadata = { title: "献立エージェント" };

const HELP_ITEMS = [
  {
    label: "使い方",
    desc: "「今週は和食中心で2人分」のように話しかけると、献立を決め、食材を確認し、買い物リストの作成まで会話で進められます。",
  },
  {
    label: "確認が必要な操作",
    desc: "新しいレシピの登録と、買い物リストの確定だけは、画面のボタンを押すまで実行されません。",
  },
  { label: "会話の保存先", desc: "会話と献立プランはこの端末のブラウザ内に保存されます。他の端末とは共有されません。" },
];

export default async function MenuAgentPage() {
  const { supabase } = await requireMenuAgentAccess();
  const familyId = await getCurrentFamilyId();
  const stores = await getFamilyStores(supabase, familyId);
  const quota = await getAiQuotaStatus(supabase);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2">
        <ZoneIcon zone="ai" icon="✨" title="献立エージェント" />
        <div>
          <h1 className="text-xl font-bold">献立エージェント</h1>
          <p className="text-xs text-gray-400">実験機能・利用許可制</p>
        </div>
        <HelpPanel title="献立エージェント" items={HELP_ITEMS} />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        会話しながら献立を決め、食材を確認し、買い物リストの作成まで進められます。
      </p>
      <AiQuotaGauge status={quota} />

      <div className="mt-6">
        <MenuAgentChat stores={stores} />
      </div>
    </div>
  );
}
