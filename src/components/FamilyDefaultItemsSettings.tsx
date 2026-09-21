"use client";

import { useState, useTransition } from "react";
import { addFamilyDefaultItem, deleteFamilyDefaultItem } from "@/app/family/actions";
import { INGREDIENT_CATEGORIES, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import type { FamilyDefaultItem } from "@/types/shopping-settings";

const CATEGORY_SUGGESTIONS = [...INGREDIENT_CATEGORIES, UNCATEGORIZED_LABEL];

export function FamilyDefaultItemsSettings({
  familyId,
  items,
  isOwner,
}: {
  familyId: string;
  items: FamilyDefaultItem[];
  isOwner: boolean;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState(UNCATEGORIZED_LABEL);
  const [isAdding, startAdd] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    setError(null);
    startAdd(async () => {
      try {
        await addFamilyDefaultItem(familyId, { name, quantity, unit, category });
        setName("");
        setQuantity("");
        setUnit("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "追加に失敗しました");
      }
    });
  }

  function handleDelete(itemId: string) {
    setError(null);
    setDeletingId(itemId);
    startDelete(async () => {
      try {
        await deleteFamilyDefaultItem(itemId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="font-semibold">どの買い物でも必ず含める食材</h2>
      <p className="mt-1 text-sm text-gray-500">
        ここに登録した食材は、買い物リストを作るたびに自動で追加されます(ラップ・ゴミ袋など消耗品向け)。
      </p>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">まだ登録されていません。</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                {item.name}
                <span className="ml-2 text-xs text-gray-400">
                  {[item.quantity, item.unit].filter((v) => v != null && v !== "").join("")} ・{" "}
                  {item.category}
                </span>
              </span>
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting && deletingId === item.id}
                  className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  削除
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isOwner ? (
        <>
          <datalist id="default-item-category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="食材名"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="数量(任意)"
              className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="単位(任意)"
              className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              list="default-item-category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="カテゴリ"
              className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding || !name.trim()}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
            >
              {isAdding ? "追加中..." : "追加"}
            </button>
          </div>
        </>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
