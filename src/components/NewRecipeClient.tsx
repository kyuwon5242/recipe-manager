"use client";

import { useState, useTransition } from "react";
import { RecipeForm } from "@/components/RecipeForm";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { createRecipe } from "@/app/recipes/actions";
import { extractRecipeFromUrl } from "@/app/recipes/extract-actions";

type Prefill = {
  recipe: {
    title: string;
    category: string | null;
    genre: string | null;
    servings: number | null;
    instructions: string | null;
    memo: string | null;
    recipe_url: string | null;
  };
  ingredients: { name: string; quantity: string; unit: string }[];
};

export function NewRecipeClient() {
  const [url, setUrl] = useState("");
  const [isExtracting, startExtract] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [formKey, setFormKey] = useState(0);

  function handleExtract() {
    if (!url.trim()) return;
    setError(null);
    setWarning(null);
    startExtract(async () => {
      const result = await extractRecipeFromUrl(url.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setWarning(result.warning);
      setPrefill({ recipe: result.recipe, ingredients: result.ingredients });
      setFormKey((k) => k + 1);
    });
  }

  return (
    <div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="block text-sm font-medium text-gray-700">
          レシピURLから自動入力
        </label>
        <p className="mt-1 text-xs text-gray-500">
          レシピサイトのURLを入力すると、AIが材料・手順を読み取ってフォームに入力します。
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || !url.trim()}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {isExtracting ? "解析中..." : "自動入力"}
          </button>
        </div>
        {isExtracting ? (
          <div className="mt-2">
            <AIThinkingIndicator label="AIがページを解析中..." />
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {warning ? (
          <p className="mt-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            ⚠ {warning}
          </p>
        ) : null}
      </div>

      <RecipeForm
        key={formKey}
        action={createRecipe}
        submitLabel="登録する"
        initialRecipe={prefill?.recipe}
        initialIngredients={prefill?.ingredients}
      />
    </div>
  );
}
