import { MealPlanForm } from "@/components/MealPlanForm";

export const metadata = { title: "献立作成" };

export default function MenuPlanPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">献立を作成する</h1>
      <p className="mt-2 text-sm text-gray-500">
        人数と含めたい品目、条件を入力すると、主食・主菜・副菜・汁物を組み合わせた献立を1セット提案します。登録済みレシピが無い品目は、AIが新しいレシピ案を考えます。
      </p>
      <MealPlanForm />
    </div>
  );
}
