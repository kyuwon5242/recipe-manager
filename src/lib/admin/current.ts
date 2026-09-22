import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`権限確認に失敗しました: ${error.message}`);
  }
  if (!profile?.is_admin) {
    throw new Error("管理者権限が必要です");
  }

  return { supabase, userId: user.id };
}

// 献立エージェントは、管理者に加えて管理者が個別に許可したユーザーも
// 利用できる(is_adminとは別の粒度の権限)。
export async function requireMenuAgentAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, can_use_menu_agent")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`権限確認に失敗しました: ${error.message}`);
  }
  if (!profile?.is_admin && !profile?.can_use_menu_agent) {
    throw new Error("献立エージェントの利用権限がありません");
  }

  return { supabase, userId: user.id };
}

// 新レシピ提案・献立提案・レシピURL自動抽出は、管理者に加えて管理者が
// 個別に許可したユーザーのみ利用できる(requireMenuAgentAccessと同じ形)。
export async function requireAiFeatureAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, can_use_ai_features")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`権限確認に失敗しました: ${error.message}`);
  }
  if (!profile?.is_admin && !profile?.can_use_ai_features) {
    throw new Error("この機能の利用には管理者の許可が必要です");
  }

  return { supabase, userId: user.id };
}
