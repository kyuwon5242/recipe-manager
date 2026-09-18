"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FamilyActionState = {
  error: string | null;
};

function generateInviteCode(): string {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 33)]
  ).join("");
}

export async function renameFamily(
  familyId: string,
  _prevState: FamilyActionState,
  formData: FormData
): Promise<FamilyActionState> {
  const name = String(formData.get("family_name") ?? "").trim();
  if (!name) {
    return { error: "家族の名前を入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({ name })
    .eq("id", familyId);

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath("/family");
  return { error: null };
}

export async function regenerateInviteCode(familyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({ invite_code: generateInviteCode() })
    .eq("id", familyId);

  if (error) {
    throw new Error(`招待コードの再発行に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}
