"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";
import { sortByCategoryOrder } from "@/lib/ingredients/categories";
import { MAX_LISTS_PER_PERSON, SHOPPING_LIST_LIMIT_MESSAGE } from "@/lib/shopping/messages";

export type CreateShoppingListItemInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

export type CreateShoppingListOptions = {
  storeId?: string | null;
  // 指定すると新規作成の代わりに既存リストを上書きする(件数上限に達した場合の代替手段)
  overwriteListId?: string | null;
  // 買い物リストのもとになったレシピ(ホームの「今回つくるレシピ」表示用)
  recipeIds?: string[];
};

export type ShoppingListSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  itemCount: number;
};

function formatJapaneseTitle(date: Date): string {
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
  }).format(date);
  return `${formatted}の買い物リスト`;
}

async function resolveCategoryOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string | null | undefined
): Promise<string[] | undefined> {
  if (!storeId) return undefined;
  const { data, error } = await supabase
    .from("family_stores")
    .select("category_order")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(`スーパー設定の取得に失敗しました: ${error.message}`);
  }
  return data?.category_order ?? undefined;
}

// 自分がこれまでに作成した買い物リストの一覧(上限に達したときの上書き先選択用)
export async function getMyShoppingListsForOverwrite(): Promise<ShoppingListSummary[]> {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, title, created_at, updated_at, shopping_list_items(id)")
    .eq("family_id", familyId)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .returns<
      { id: string; title: string; created_at: string; updated_at: string; shopping_list_items: { id: string }[] }[]
    >();

  if (error) {
    throw new Error(`買い物リストの取得に失敗しました: ${error.message}`);
  }

  return (data ?? []).map((list) => ({
    id: list.id,
    title: list.title,
    created_at: list.created_at,
    updated_at: list.updated_at,
    itemCount: list.shopping_list_items.length,
  }));
}

export async function createShoppingList(
  items: CreateShoppingListItemInput[],
  options: CreateShoppingListOptions = {}
) {
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

  const categoryOrder = await resolveCategoryOrder(supabase, options.storeId);
  const sortedItems = categoryOrder ? sortByCategoryOrder(items, categoryOrder) : items;
  // 自分の家族に属さないstoreIdが渡された場合はRLSにより取得できずcategoryOrder
  // がundefinedになる。その場合はstore_idとしても保存しない(不整合な参照を防ぐ)。
  const resolvedStoreId = categoryOrder ? options.storeId ?? null : null;

  await Promise.all(
    sortedItems.map((item) =>
      supabase
        .from("ingredients_master")
        .upsert({ name: item.name, category: item.category }, { onConflict: "name" })
    )
  );

  let listId: string;
  const now = new Date();

  if (options.overwriteListId) {
    const { data: existing, error: existingError } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", options.overwriteListId)
      .eq("family_id", familyId)
      .eq("created_by", user.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(`上書き先リストの確認に失敗しました: ${existingError.message}`);
    }
    if (!existing) {
      throw new Error("上書き先の買い物リストが見つかりません");
    }

    const { error: deleteError } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("shopping_list_id", existing.id);

    if (deleteError) {
      throw new Error(`既存の食材の削除に失敗しました: ${deleteError.message}`);
    }

    const { error: deleteRecipesError } = await supabase
      .from("shopping_list_recipes")
      .delete()
      .eq("shopping_list_id", existing.id);

    if (deleteRecipesError) {
      throw new Error(`既存のレシピ紐付けの削除に失敗しました: ${deleteRecipesError.message}`);
    }

    const { error: updateError } = await supabase
      .from("shopping_lists")
      .update({
        title: formatJapaneseTitle(now),
        updated_at: now.toISOString(),
        store_id: resolvedStoreId,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`買い物リストの更新に失敗しました: ${updateError.message}`);
    }

    listId = existing.id;
  } else {
    const { count, error: countError } = await supabase
      .from("shopping_lists")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("created_by", user.id);

    if (countError) {
      throw new Error(`買い物リスト件数の確認に失敗しました: ${countError.message}`);
    }
    if ((count ?? 0) >= MAX_LISTS_PER_PERSON) {
      throw new Error(SHOPPING_LIST_LIMIT_MESSAGE);
    }

    const { data: list, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        family_id: familyId,
        created_by: user.id,
        title: formatJapaneseTitle(now),
        store_id: resolvedStoreId,
      })
      .select("id")
      .single();

    if (listError) {
      throw new Error(`買い物リストの作成に失敗しました: ${listError.message}`);
    }

    listId = list.id;
  }

  const { error: itemsError } = await supabase.from("shopping_list_items").insert(
    sortedItems.map((item, index) => ({
      shopping_list_id: listId,
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

  const recipeIds = Array.from(new Set(options.recipeIds ?? []));
  if (recipeIds.length > 0) {
    const { error: recipesError } = await supabase.from("shopping_list_recipes").insert(
      recipeIds.map((recipeId, index) => ({
        shopping_list_id: listId,
        recipe_id: recipeId,
        position: index,
      }))
    );

    if (recipesError) {
      throw new Error(`レシピの紐付け保存に失敗しました: ${recipesError.message}`);
    }
  }

  redirect(`/shopping-lists/${listId}`);
}
