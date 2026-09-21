"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";

export async function updateUserDisplayName(userId: string, displayName: string) {
  const { supabase } = await requireAdmin();

  const trimmed = displayName.trim();
  if (!trimmed) {
    throw new Error("表示名を入力してください");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", userId);

  if (error) {
    throw new Error(`表示名の更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/admin/users");
}

export async function toggleUserSuspension(userId: string, nextValue: boolean) {
  const { supabase, userId: adminUserId } = await requireAdmin();

  if (userId === adminUserId && nextValue) {
    throw new Error("自分自身を利用停止にはできません");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: nextValue })
    .eq("id", userId);

  if (error) {
    throw new Error(`利用停止状態の更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/admin/users");
}

export async function toggleMenuAgentAccess(userId: string, nextValue: boolean) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ can_use_menu_agent: nextValue })
    .eq("id", userId);

  if (error) {
    throw new Error(`献立エージェント権限の更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/admin/users");
}
