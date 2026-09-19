import Link from "next/link";
import type { ExistingRecipeSuggestion } from "@/types/recipe-suggestion";

export function ExistingRecipeSuggestionCard({
  suggestion,
}: {
  suggestion: ExistingRecipeSuggestion;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <Link
        href={`/recipes/${suggestion.recipe_id}`}
        className="font-semibold text-emerald-700 hover:underline"
      >
        {suggestion.title}
      </Link>
      <p className="mt-1 text-sm text-gray-500">{suggestion.reason}</p>
    </div>
  );
}
