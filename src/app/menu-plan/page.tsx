import { MealPlanForm } from "@/components/MealPlanForm";
import { WithMealPlanTray } from "@/components/WithMealPlanTray";
import { ZoneIcon } from "@/components/ZoneIcon";
import { HelpPanel } from "@/components/HelpPanel";

export const metadata = { title: "献立提案" };

const HELP_ITEMS = [
  {
    label: "使い方",
    desc: "品目(主食・主菜・副菜・汁物)ごとに欲しい品数を指定すると、登録済みレシピの中からAIがまとめて献立を提案します。",
  },
  {
    label: "該当レシピが無い場合",
    desc: "その品目は「見つかりませんでした」と表示されます。新レシピ提案でAIに考えてもらうか、先にレシピを登録してください。",
  },
  { label: "気に入ったら", desc: "提案された献立は献立トレイに追加できます。" },
];

export default function MenuPlanPage() {
  return (
    <WithMealPlanTray>
      <div className="flex items-center gap-2">
        <ZoneIcon zone="ai" icon="🍽️" />
        <h1 className="text-2xl font-bold">献立を提案してもらう</h1>
        <HelpPanel title="献立提案" items={HELP_ITEMS} />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        含めたい品目(主食・主菜・副菜・汁物)の品数と条件を入力すると、登録済みレシピの中から組み合わせた献立を1セット提案します。気に入ったものは献立トレイに追加できます。
      </p>
      <MealPlanForm />
    </WithMealPlanTray>
  );
}
