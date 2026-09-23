import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 開発環境専用のテストアカウント自動ログイン。`next build`(本番・プレビュー
// とも)ではNODE_ENVが常に"production"になるため、`next dev`のローカル環境
// でしか動作しない(デプロイ環境には一切露出しない)。
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  const email = process.env.DEV_TEST_LOGIN_EMAIL;
  const password = process.env.DEV_TEST_LOGIN_PASSWORD;
  if (!email || !password) {
    return new Response(
      "テストログイン未設定です。.env.localにDEV_TEST_LOGIN_EMAIL / DEV_TEST_LOGIN_PASSWORDを設定してください。",
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return new Response(`テストアカウントへのログインに失敗しました: ${error.message}`, {
      status: 500,
    });
  }

  redirect("/");
}
