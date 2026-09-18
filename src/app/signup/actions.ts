"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupState = {
  error: string | null;
  message: string | null;
};

export async function signUpWithPassword(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください", message: null };
  }
  if (password.length < 6) {
    return { error: "パスワードは6文字以上で入力してください", message: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: `登録に失敗しました: ${error.message}`, message: null };
  }

  if (!data.session) {
    return {
      error: null,
      message: "確認メールを送信しました。メール内のリンクからログインを完了してください。",
    };
  }

  redirect("/family/setup");
}
