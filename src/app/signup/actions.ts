"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type SignupState = {
  error: string | null;
  message: string | null;
};

export async function signUpWithPassword(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!nickname || !email || !password) {
    return { error: "ニックネーム・メールアドレス・パスワードを入力してください", message: null };
  }
  if (password.length < 6) {
    return { error: "パスワードは6文字以上で入力してください", message: null };
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // handle_new_user()トリガーがraw_user_meta_dataのfull_nameを
      // display_nameとして読むため、ここに渡すだけでDB側の変更は不要。
      data: { full_name: nickname },
    },
  });

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
