import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShoppingListChecklist } from "@/components/ShoppingListChecklist";
import { DeleteShoppingListButton } from "@/components/DeleteShoppingListButton";
import { MealPlanDetailsSection } from "@/components/MealPlanDetailsSection";
import { formatDateTime } from "@/lib/format-date";
import type { ShoppingListItem } from "@/types/shopping-list";

type ListRow = {
  id: string;
  title: string;
  memo: string | null;
  meal_memo: string | null;
  created_at: string;
  updated_at: string;
  store_id: string | null;
  family_stores: { category_order: string[] } | null;
  shopping_list_recipes: {
    position: number;
    servings: number | null;
    recipes: { id: string; title: string; genre: string | null; category: string | null } | null;
  }[];
};

export default async function ShoppingListDetailPage({
  params,
}: PageProps<"/shopping-lists/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("shopping_lists")
    .select(
      "id, title, memo, meal_memo, created_at, updated_at, store_id, family_stores(category_order), shopping_list_recipes(position, servings, recipes(id, title, genre, category))"
    )
    .eq("id", id)
    .maybeSingle<ListRow>();

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
      <Link href="/shopping-lists" className="text-sm text-brand-700 hover:underline">
        ← 買い物リスト一覧に戻る
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{list.title}</h1>
        <DeleteShoppingListButton listId={list.id} />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        作成: {formatDateTime(list.created_at)}
        {list.updated_at !== list.created_at ? ` ・ 更新: ${formatDateTime(list.updated_at)}` : ""}
      </p>
      <p className="mt-1 text-xs text-gray-400">タップすると購入済みにできます</p>

      <ShoppingListChecklist
        listId={list.id}
        items={items ?? []}
        categoryOrder={list.family_stores?.category_order}
        initialMemo={list.memo}
      />

      <MealPlanDetailsSection
        listId={list.id}
        initialMealMemo={list.meal_memo}
        recipes={(list.shopping_list_recipes ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .filter((r) => r.recipes !== null)
          .map((r) => ({
            id: r.recipes!.id,
            title: r.recipes!.title,
            genre: r.recipes!.genre,
            category: r.recipes!.category,
            servings: r.servings,
          }))}
      />
    </div>
  );
}
