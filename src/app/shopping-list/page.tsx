import { createClient } from "@/lib/supabase/server";
import { ShoppingListForm } from "@/components/ShoppingListForm";

export const metadata = { title: "買い物リスト作成" };

export default async function ShoppingListPage() {
  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, category, genre")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`レシピの取得に失敗しました: ${error.message}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">買い物リストを作成</h1>
      <p className="mt-2 text-sm text-gray-500">
        作る予定のレシピを選び、手持ちの食材を自由に入力すると、AIエージェントが不足分を買い物リストにまとめます。
      </p>
      <ShoppingListForm recipes={recipes ?? []} />
    </div>
  );
}
