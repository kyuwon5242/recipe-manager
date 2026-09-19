import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShoppingListChecklist } from "@/components/ShoppingListChecklist";
import { DeleteShoppingListButton } from "@/components/DeleteShoppingListButton";
import type { ShoppingListItem } from "@/types/shopping-list";

export default async function ShoppingListDetailPage({
  params,
}: PageProps<"/shopping-lists/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("shopping_lists")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`買い物リストの取得に失敗しました: ${error.message}`);
  }
  if (!list) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("shopping_list_id", id)
    .order("position", { ascending: true })
    .returns<ShoppingListItem[]>();

  if (itemsError) {
    throw new Error(`食材の取得に失敗しました: ${itemsError.message}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/shopping-lists" className="text-sm text-emerald-700 hover:underline">
        ← 買い物リスト一覧に戻る
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{list.title}</h1>
        <DeleteShoppingListButton listId={list.id} />
      </div>
      <p className="mt-1 text-xs text-gray-400">タップすると購入済みにできます</p>

      <ShoppingListChecklist listId={list.id} items={items ?? []} />
    </div>
  );
}
