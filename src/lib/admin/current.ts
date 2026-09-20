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
