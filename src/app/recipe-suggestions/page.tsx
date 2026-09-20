import { RecipeSuggestionForm } from "@/components/RecipeSuggestionForm";
import { WithMealPlanTray } from "@/components/WithMealPlanTray";

export const metadata = { title: "新レシピ提案" };

export default function RecipeSuggestionsPage() {
  return (
    <WithMealPlanTray>
      <h1 className="text-2xl font-bold">新レシピを提案してもらう</h1>
      <p className="mt-2 text-sm text-gray-500">
        気分・食べたいジャンル・手持ちの食材・季節感など、自由に入力してください。AIが新しいレシピ案を考えます。案は献立トレイへドラッグして枠に設定できます。
      </p>
      <RecipeSuggestionForm />
    </WithMealPlanTray>
  );
}
