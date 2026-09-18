import { createClient } from "@/lib/supabase/server";

export async function getCurrentFamilyId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data, error } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`家族情報の取得に失敗しました: ${error.message}`);
  }
  if (!data) {
    throw new Error("家族に参加していません");
  }

  return data.family_id;
}
