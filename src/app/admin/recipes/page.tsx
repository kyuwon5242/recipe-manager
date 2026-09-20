import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";

export const metadata = { title: "全レシピ(管理者)" };

type AdminRecipeRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  created_at: string;
  families: { name: string } | null;
};

export default async function AdminRecipesPage() {
  const { supabase } = await requireAdmin();

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, category, genre, created_at, families(name)")
    .order("created_at", { ascending: false })
    .returns<AdminRecipeRow[]>();

  if (error) {
    throw new Error(`レシピの取得に失敗しました: ${error.message}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <h1 className="mt-2 text-2xl font-bold">全レシピ(管理者) - {recipes.length}件</h1>
      <ul className="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div>
              <Link
                href={`/recipes/${recipe.id}`}
                className="font-medium text-emerald-700 hover:underline"
              >
                {recipe.title}
              </Link>
              <span className="ml-2 text-gray-400">
                {[recipe.category, recipe.genre].filter(Boolean).join(" / ")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{recipe.families?.name ?? "不明な家族"}</span>
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
              >
                編集
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
