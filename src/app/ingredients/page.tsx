import { requireAdmin } from "@/lib/admin/current";
import { IngredientCleanupForm } from "@/components/IngredientCleanupForm";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "食材の整理" };
// AIによる整理は食材数が多いと数分かかることがあるため、Vercel上でも
// タイムアウトしないよう上限を延長する(Hobbyプランの実際の上限である
// 60秒を指定。それ以上は仕様上Hobbyでは延長できない)。
export const maxDuration = 60;

export default async function IngredientsPage() {
  // 家族を跨いだ共有辞書全体を書き換える、コストのかかる一括AI処理のため
  // 管理者のみに限定する(誰でも実行できると意図せずAI呼び出しが繰り返される
  // おそれがあるため)。
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">食材の整理</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        レシピによって食材名の表記(商品名・銘柄など)が異なると、「必要な食材」で同じ食材が別々に表示されたり、カテゴリが「未分類」のままになったりします。AIが未分類の食材名だけを分析し、同じ食材をまとめてカテゴリを設定します(分類済みの食材は対象外なので、実行のたびに全件処理されるわけではありません)。実行すれば家族全員に反映されます。
      </p>
      <div className="mt-6">
        <IngredientCleanupForm />
      </div>
    </div>
  );
}
