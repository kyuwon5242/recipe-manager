"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

type IngredientRow = { name: string; quantity: string; unit: string };

type RecipeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  initialRecipe?: {
    title: string;
    category: string | null;
    genre: string | null;
    servings: number | null;
    instructions: string | null;
    memo: string | null;
    recipe_url: string | null;
  };
  initialIngredients?: IngredientRow[];
};

const emptyRow: IngredientRow = { name: "", quantity: "", unit: "" };

export function RecipeForm({
  action,
  submitLabel,
  initialRecipe,
  initialIngredients,
}: RecipeFormProps) {
  const [rows, setRows] = useState<IngredientRow[]>(
    initialIngredients && initialIngredients.length > 0
      ? initialIngredients
      : [emptyRow]
  );

  function updateRow(index: number, field: keyof IngredientRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { ...emptyRow }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          レシピ名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          required
          defaultValue={initialRecipe?.title}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            カテゴリ
          </label>
          <input
            type="text"
            name="category"
            placeholder="和食 / 洋食 / 中華 など"
            defaultValue={initialRecipe?.category ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            ジャンル
          </label>
          <input
            type="text"
            name="genre"
            placeholder="主菜 / 副菜 / 汁物 など"
            defaultValue={initialRecipe?.genre ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            人前
          </label>
          <input
            type="number"
            name="servings"
            min={1}
            defaultValue={initialRecipe?.servings ?? undefined}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            参照元URL
          </label>
          <input
            type="url"
            name="recipe_url"
            placeholder="https://..."
            defaultValue={initialRecipe?.recipe_url ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            材料
          </label>
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-brand-700 hover:underline"
          >
            + 材料を追加
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                name="ingredient_name"
                placeholder="食材名(例: 玉ねぎ)"
                value={row.name}
                onChange={(e) => updateRow(index, "name", e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                name="ingredient_quantity"
                placeholder="数量"
                value={row.quantity}
                onChange={(e) => updateRow(index, "quantity", e.target.value)}
                className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                name="ingredient_unit"
                placeholder="単位"
                value={row.unit}
                onChange={(e) => updateRow(index, "unit", e.target.value)}
                className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                className="px-2 text-sm text-gray-400 hover:text-red-600 disabled:opacity-30"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          作り方
        </label>
        <textarea
          name="instructions"
          rows={6}
          defaultValue={initialRecipe?.instructions ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          メモ
        </label>
        <textarea
          name="memo"
          rows={3}
          defaultValue={initialRecipe?.memo ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <SubmitButton label={submitLabel} pendingLabel="保存中..." />
    </form>
  );
}
