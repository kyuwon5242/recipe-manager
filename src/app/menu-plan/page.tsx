import { MealPlanForm } from "@/components/MealPlanForm";
import { WithMealPlanTray } from "@/components/WithMealPlanTray";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "献立提案" };

export default function MenuPlanPage() {
  return (
    <WithMealPlanTray>
      <div className="flex items-center gap-3">
        <ZoneIcon zone="ai" icon="🍽️" />
        <h1 className="text-2xl font-bold">献立を提案してもらう</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        含めたい品目(主食・主菜・副菜・汁物)の品数と条件を入力すると、組み合わせた献立を1セット提案します。登録済みレシピが無い品目は、AIが新しいレシピ案を考えます。気に入ったものは献立トレイへドラッグして枠に設定できます。
      </p>
      <MealPlanForm />
    </WithMealPlanTray>
  );
}
