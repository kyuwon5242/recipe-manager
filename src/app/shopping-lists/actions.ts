"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleShoppingListItem(
  itemId: string,
  listId: string,
  checked: boolean
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ is_checked: checked })
    .eq("id", itemId);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
}

// チェック操作のたびに通信するのではなく、クライアント側で少し待ってから
// まとめて送るためのバルク版。1回の呼び出しで複数件のis_checkedを更新する。
export async function bulkUpdateShoppingListItems(
  listId: string,
  updates: { id: string; is_checked: boolean }[]
) {
  if (updates.length === 0) return;

  const supabase = await createClient();
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from("shopping_list_items").update({ is_checked: u.is_checked }).eq("id", u.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(`更新に失敗しました: ${failed.error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
}

export async function deleteShoppingList(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").delete().eq("id", id);

  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/shopping-lists");
  redirect("/shopping-lists");
}
