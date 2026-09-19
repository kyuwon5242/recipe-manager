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

export async function deleteShoppingList(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").delete().eq("id", id);

  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/shopping-lists");
  redirect("/shopping-lists");
}
