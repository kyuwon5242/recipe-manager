"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";

export type CreateShoppingListItemInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

const MAX_LISTS_PER_PERSON = 3;

function formatJapaneseTitle(date: Date): string {
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
  }).format(date);
  return `${formatted}の買い物リスト`;
}

export async function createShoppingList(items: CreateShoppingListItemInput[]) {
  if (items.length === 0) {
    throw new Error("食材リストが空です");
  }

  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { count, error: countError } = await supabase
    .from("shopping_lists")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("created_by", user.id);

  if (countError) {
    throw new Error(`買い物リスト件数の確認に失敗しました: ${countError.message}`);
  }
  if ((count ?? 0) >= MAX_LISTS_PER_PERSON) {
    throw new Error(
      `買い物リストは1人${MAX_LISTS_PER_PERSON}件までです。先に不要なリストを削除してください。`
    );
  }

  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .insert({
      family_id: familyId,
      created_by: user.id,
      title: formatJapaneseTitle(new Date()),
    })
    .select("id")
    .single();

  if (listError) {
    throw new Error(`買い物リストの作成に失敗しました: ${listError.message}`);
  }

  await Promise.all(
    items.map((item) =>
      supabase
        .from("ingredients_master")
        .upsert({ name: item.name, category: item.category }, { onConflict: "name" })
    )
  );

  const { error: itemsError } = await supabase.from("shopping_list_items").insert(
    items.map((item, index) => ({
      shopping_list_id: list.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      position: index,
    }))
  );

  if (itemsError) {
    throw new Error(`買い物リストの保存に失敗しました: ${itemsError.message}`);
  }

  redirect(`/shopping-lists/${list.id}`);
}
