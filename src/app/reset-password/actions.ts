"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  error: string | null;
};

export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!password) {
    return { error: "新しいパスワードを入力してください" };
  }
  if (password.length < 6) {
    return { error: "パスワードは6文字以上で入力してください" };
  }
  if (password !== passwordConfirm) {
    return { error: "パスワードが一致しません" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: `パスワードの更新に失敗しました: ${error.message}` };
  }

  redirect("/recipes");
}
