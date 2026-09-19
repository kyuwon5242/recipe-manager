import { NewRecipeClient } from "@/components/NewRecipeClient";

export const metadata = { title: "レシピ登録" };

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">レシピを登録</h1>
      <NewRecipeClient />
    </div>
  );
}
