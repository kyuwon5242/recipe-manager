import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "買い物リスト" };

type ShoppingListRow = {
  id: string;
  title: string;
  created_at: string;
  profiles: { display_name: string | null; email: string | null } | null;
  shopping_list_items: { id: string; is_checked: boolean }[];
};

export default async function ShoppingListsPage() {
  const supabase = await createClient();
  const { data: lists, error } = await supabase
    .from("shopping_lists")
    .select(
      "id, title, created_at, profiles(display_name, email), shopping_list_items(id, is_checked)"
    )
    .order("created_at", { ascending: false })
    .returns<ShoppingListRow[]>();

  if (error) {
    throw new Error(`買い物リストの取得に失敗しました: ${error.message}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">買い物リスト</h1>
        <Link
          href="/shopping-list"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
        >
          + 食材リストを作成
        </Link>
      </div>

      {(lists ?? []).length === 0 ? (
        <p className="mt-6 text-gray-500">まだ買い物リストがありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {lists.map((list) => {
            const total = list.shopping_list_items.length;
            const checked = list.shopping_list_items.filter((i) => i.is_checked).length;
            return (
              <li key={list.id}>
                <Link
                  href={`/shopping-lists/${list.id}`}
                  className="block rounded-lg border border-gray-200 p-4 transition hover:border-brand-500 hover:shadow-sm"
                >
                  <p className="font-semibold">{list.title}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {list.profiles?.display_name ?? list.profiles?.email ?? "unknown"} が作成
                    ・ {checked}/{total} 購入済み
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
