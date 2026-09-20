import { MealPlanForm } from "@/components/MealPlanForm";

export const metadata = { title: "献立提案" };

export default function MenuPlanPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">献立を提案してもらう</h1>
      <p className="mt-2 text-sm text-gray-500">
        含めたい品目(主食・主菜・副菜・汁物)の品数と条件を入力すると、組み合わせた献立を1セット提案します。登録済みレシピが無い品目は、AIが新しいレシピ案を考えます。人数はレシピが決まってから、食材リスト作成の画面で調整できます。
      </p>
      <MealPlanForm />
    </div>
  );
}
