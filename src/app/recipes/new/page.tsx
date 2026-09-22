import { NewRecipeClient } from "@/components/NewRecipeClient";
import { AiQuotaGauge } from "@/components/AiQuotaGauge";
import { createClient } from "@/lib/supabase/server";
import { getAiQuotaStatus } from "@/lib/ai-usage/quota";

export const metadata = { title: "レシピ登録" };

export default async function NewRecipePage() {
  const supabase = await createClient();
  const quota = await getAiQuotaStatus(supabase);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">レシピを登録</h1>
      <p className="mt-1 text-xs text-gray-400">URLからのAI自動入力を使う場合の残量です。</p>
      <AiQuotaGauge status={quota} />
      <NewRecipeClient />
    </div>
  );
}
