import { IngredientCleanupForm } from "@/components/IngredientCleanupForm";

export const metadata = { title: "食材の整理" };
// AIによる整理は食材数が多いと数分かかることがあるため、Vercel上でも
// タイムアウトしないよう上限を延長する(Hobbyプランでは60秒が上限)。
export const maxDuration = 300;

export default function IngredientsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">食材の整理</h1>
      <p className="mt-2 text-sm text-gray-500">
        レシピによって食材名の表記(商品名・銘柄など)が異なると、「必要な食材」で同じ食材が別々に表示されたり、カテゴリが「未分類」のままになったりします。AIが食材名を分析し、同じ食材をまとめてカテゴリを設定します。家族の誰かが実行すれば全員に反映されます。
      </p>
      <div className="mt-6">
        <IngredientCleanupForm />
      </div>
    </div>
  );
}
