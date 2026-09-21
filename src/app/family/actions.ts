"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INGREDIENT_CATEGORIES, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { MAX_FAMILY_STORES } from "@/types/shopping-settings";

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

// ============================================================
// よく使うスーパー(カテゴリの並び順)
// ============================================================

export async function addFamilyStore(familyId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("スーパー名を入力してください");
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("family_stores")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);

  if (countError) {
    throw new Error(`スーパー件数の確認に失敗しました: ${countError.message}`);
  }
  if ((count ?? 0) >= MAX_FAMILY_STORES) {
    throw new Error(`よく使うスーパーは${MAX_FAMILY_STORES}件までです。先に不要なものを削除してください。`);
  }

  const { error } = await supabase.from("family_stores").insert({
    family_id: familyId,
    name: trimmed,
    category_order: [...INGREDIENT_CATEGORIES],
    position: count ?? 0,
  });

  if (error) {
    throw new Error(`スーパーの追加に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}

export async function renameFamilyStore(storeId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("スーパー名を入力してください");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("family_stores").update({ name: trimmed }).eq("id", storeId);

  if (error) {
    throw new Error(`スーパー名の更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}

export async function updateFamilyStoreCategoryOrder(
  storeId: string,
  categoryOrder: string[]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("family_stores")
    .update({ category_order: categoryOrder })
    .eq("id", storeId);

  if (error) {
    throw new Error(`並び順の更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}

export async function deleteFamilyStore(storeId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("family_stores").delete().eq("id", storeId);

  if (error) {
    throw new Error(`スーパーの削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}

// ============================================================
// どの買い物でも必ず含める食材(デフォルト食材)
// ============================================================

export async function addFamilyDefaultItem(
  familyId: string,
  input: { name: string; quantity: string; unit: string; category: string }
): Promise<void> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("食材名を入力してください");
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("family_default_items")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);

  if (countError) {
    throw new Error(`件数の確認に失敗しました: ${countError.message}`);
  }

  const { error } = await supabase.from("family_default_items").insert({
    family_id: familyId,
    name,
    quantity: input.quantity.trim() ? Number(input.quantity) : null,
    unit: input.unit.trim() || null,
    category: input.category.trim() || UNCATEGORIZED_LABEL,
    position: count ?? 0,
  });

  if (error) {
    throw new Error(`食材の追加に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}

export async function deleteFamilyDefaultItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("family_default_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(`食材の削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/family");
}
