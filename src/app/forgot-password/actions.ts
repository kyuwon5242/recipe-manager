"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  error: string | null;
  message: string | null;
};

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "メールアドレスを入力してください", message: null };
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // 該当メールアドレスの存在有無を漏らさないため、画面には出さずサーバー
    // ログにのみ残す(レート制限などの調査用)。
    console.error("resetPasswordForEmail failed:", error.status, error.message);
  }

  // 該当メールアドレスの存在有無を漏らさないため、成功・失敗に関わらず同じ
  // メッセージを返す。
  return {
    error: null,
    message:
      "該当するアカウントが存在する場合、パスワード再設定用のメールを送信しました。メール内のリンクから手続きを進めてください。",
  };
}
