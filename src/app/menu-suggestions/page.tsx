import { MenuSuggestionForm } from "@/components/MenuSuggestionForm";

export const metadata = { title: "メニュー提案" };

export default function MenuSuggestionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">メニューを提案してもらう</h1>
      <p className="mt-2 text-sm text-gray-500">
        気分・食べたいジャンル・手持ちの食材・季節感など、自由に入力してください。登録済みのレシピから探すほか、AIが新しいレシピ案も考えます。
      </p>
      <MenuSuggestionForm />
    </div>
  );
}
