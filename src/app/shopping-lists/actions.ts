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

export type ShoppingListItemInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

// 確定済みの買い物リストに、後から項目を追加する(分類の末尾に追加)。
export async function addShoppingListItem(listId: string, item: ShoppingListItemInput) {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("shopping_list_items")
    .select("id", { count: "exact", head: true })
    .eq("shopping_list_id", listId);

  if (countError) {
    throw new Error(`件数の確認に失敗しました: ${countError.message}`);
  }

  const { data, error } = await supabase
    .from("shopping_list_items")
    .insert({
      shopping_list_id: listId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      position: count ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`項目の追加に失敗しました: ${error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
  return data;
}

// 確定済みの買い物リストの項目を編集する(名前・数量・単位・カテゴリ)。
export async function updateShoppingListItem(
  listId: string,
  itemId: string,
  patch: Partial<ShoppingListItemInput>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").update(patch).eq("id", itemId);

  if (error) {
    throw new Error(`項目の更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
}

export async function deleteShoppingListItem(listId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(`項目の削除に失敗しました: ${error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
}

// リスト全体のメモ(店員に伝えたいこと、まとめ買いの注意など)を更新する。
export async function updateShoppingListMemo(listId: string, memo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").update({ memo }).eq("id", listId);

  if (error) {
    throw new Error(`メモの更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
}

// 献立単位のメモ(買い物メモとは別。「対象の献立」欄から編集する)
export async function updateShoppingListMealMemo(listId: string, mealMemo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").update({ meal_memo: mealMemo }).eq("id", listId);

  if (error) {
    throw new Error(`献立メモの更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/shopping-lists/${listId}`);
  revalidatePath("/");
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
