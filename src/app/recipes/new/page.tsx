import { NewRecipeClient } from "@/components/NewRecipeClient";
import { AiQuotaGauge } from "@/components/AiQuotaGauge";
import { createClient } from "@/lib/supabase/server";
import { getAiQuotaStatus } from "@/lib/ai-usage/quota";

export const metadata = { title: "レシピ登録" };

export default async function NewRecipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("is_admin, can_use_ai_features")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const canUseAi = (profile?.is_admin || profile?.can_use_ai_features) ?? false;
  const quota = canUseAi ? await getAiQuotaStatus(supabase) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">レシピを登録</h1>
      {canUseAi ? (
        <>
          <p className="mt-1 text-xs text-gray-400">URLからのAI自動入力を使う場合の残量です。</p>
          {quota ? <AiQuotaGauge status={quota} /> : null}
        </>
      ) : null}
      <NewRecipeClient canUseAi={canUseAi} />
    </div>
  );
}
