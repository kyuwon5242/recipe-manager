"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FamilySetupState = {
  error: string | null;
};

export async function createFamilyAction(
  _prevState: FamilySetupState,
  formData: FormData
): Promise<FamilySetupState> {
  const name = String(formData.get("family_name") ?? "").trim();
  if (!name) {
    return { error: "家族の名前を入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_family", { family_name: name });

  if (error) {
    return { error: `家族の作成に失敗しました: ${error.message}` };
  }

  redirect("/recipes");
}

export async function joinFamilyAction(
  _prevState: FamilySetupState,
  formData: FormData
): Promise<FamilySetupState> {
  const code = String(formData.get("invite_code") ?? "").trim();
  if (!code) {
    return { error: "招待コードを入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_family_with_code", { code });

  if (error) {
    return { error: "招待コードが見つかりませんでした。確認して再度お試しください" };
  }

  redirect("/recipes");
}
