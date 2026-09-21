import { RecipeSuggestionForm } from "@/components/RecipeSuggestionForm";
import { WithMealPlanTray } from "@/components/WithMealPlanTray";
import { ZoneIcon } from "@/components/ZoneIcon";
import { HelpPanel } from "@/components/HelpPanel";

export const metadata = { title: "新レシピ提案" };

const HELP_ITEMS = [
  {
    label: "使い方",
    desc: "食べたい気分や条件を自由に入力すると、AIが登録済みレシピと被らない新しいレシピ案を考えます。",
  },
  { label: "気に入ったら", desc: "提案されたレシピは献立トレイに追加したり、そのまま登録できます。" },
];

export default function RecipeSuggestionsPage() {
  return (
    <WithMealPlanTray>
      <div className="flex items-center gap-2">
        <ZoneIcon zone="ai" />
        <h1 className="text-2xl font-bold">新レシピを提案してもらう</h1>
        <HelpPanel title="新レシピ提案" items={HELP_ITEMS} />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        気分・食べたいジャンル・手持ちの食材・季節感など、自由に入力してください。AIが新しいレシピ案を考えます。案は献立トレイへドラッグして枠に設定できます。
      </p>
      <RecipeSuggestionForm />
    </WithMealPlanTray>
  );
}
