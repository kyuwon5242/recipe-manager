import { RecipeSuggestionForm } from "@/components/RecipeSuggestionForm";
import { WithMealPlanTray } from "@/components/WithMealPlanTray";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "新レシピ提案" };

export default function RecipeSuggestionsPage() {
  return (
    <WithMealPlanTray>
      <div className="flex items-center gap-3">
        <ZoneIcon zone="ai" />
        <h1 className="text-2xl font-bold">新レシピを提案してもらう</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        気分・食べたいジャンル・手持ちの食材・季節感など、自由に入力してください。AIが新しいレシピ案を考えます。案は献立トレイへドラッグして枠に設定できます。
      </p>
      <RecipeSuggestionForm />
    </WithMealPlanTray>
  );
}
