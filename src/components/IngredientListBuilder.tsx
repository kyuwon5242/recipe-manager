"use client";

import { useMemo, useState, useTransition } from "react";
import { createShoppingList } from "@/app/shopping-list/actions";
import type { BuilderRecipe, DraftItem } from "@/types/shopping-list";

const DEFAULT_CATEGORY = "未分類";
const CATEGORY_SUGGESTIONS = ["野菜", "肉・魚", "調味料", "乳製品・卵", "主食", DEFAULT_CATEGORY];

type NeededIngredient = {
  key: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function IngredientListBuilder({ recipes }: { recipes: BuilderRecipe[] }) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [ownedQuantities, setOwnedQuantities] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "draft">("select");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, startConfirm] = useTransition();

  const neededIngredients = useMemo<NeededIngredient[]>(() => {
    const map = new Map<string, NeededIngredient>();
    for (const recipe of recipes) {
      if (!selectedRecipeIds.has(recipe.id)) continue;
      for (const ingredient of recipe.ingredients) {
        const key = `${ingredient.name}__${ingredient.unit ?? ""}`;
        const existing = map.get(key);
        if (existing) {
          if (existing.quantity != null && ingredient.quantity != null) {
            existing.quantity += ingredient.quantity;
          } else {
            existing.quantity = null;
          }
        } else {
          map.set(key, {
            key,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category ?? DEFAULT_CATEGORY,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [selectedRecipeIds, recipes]);

  function toggleRecipe(id: string) {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerateDraft() {
    const items: DraftItem[] = [];
    for (const ingredient of neededIngredients) {
      const ownedRaw = ownedQuantities[ingredient.key]?.trim();
      const owned = ownedRaw ? Number(ownedRaw) : 0;

      if (ingredient.quantity == null) {
        if (owned > 0) continue;
        items.push({
          key: crypto.randomUUID(),
          name: ingredient.name,
          quantity: null,
          unit: ingredient.unit,
          category: ingredient.category,
        });
        continue;
      }

      const shortfall = ingredient.quantity - owned;
      if (shortfall > 0) {
        items.push({
          key: crypto.randomUUID(),
          name: ingredient.name,
          quantity: shortfall,
          unit: ingredient.unit,
          category: ingredient.category,
        });
      }
    }

    setDraftItems(items);
    setCategoryOrder(Array.from(new Set(items.map((i) => i.category))));
    setConfirmError(null);
    setStep("draft");
  }

  function updateDraftItem(key: string, patch: Partial<DraftItem>) {
    setDraftItems((prev) => {
      const next = prev.map((item) => (item.key === key ? { ...item, ...patch } : item));
      if (patch.category) {
        setCategoryOrder((prevOrder) =>
          prevOrder.includes(patch.category!) ? prevOrder : [...prevOrder, patch.category!]
        );
      }
      return next;
    });
  }

  function removeDraftItem(key: string) {
    setDraftItems((prev) => prev.filter((item) => item.key !== key));
  }

  function addDraftItem() {
    const category = categoryOrder[0] ?? DEFAULT_CATEGORY;
    setDraftItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), name: "", quantity: null, unit: null, category },
    ]);
    setCategoryOrder((prev) => (prev.includes(category) ? prev : [...prev, category]));
  }

  function handleCategoryDrop(targetCategory: string) {
    if (!draggingCategory || draggingCategory === targetCategory) {
      setDraggingCategory(null);
      return;
    }
    setCategoryOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggingCategory);
      const toIndex = next.indexOf(targetCategory);
      if (fromIndex === -1 || toIndex === -1) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggingCategory);
      return next;
    });
    setDraggingCategory(null);
  }

  function handleConfirm() {
    setConfirmError(null);
    const orderedItems = categoryOrder
      .flatMap((category) => draftItems.filter((item) => item.category === category))
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      }))
      .filter((item) => item.name.length > 0);

    if (orderedItems.length === 0) {
      setConfirmError("食材リストが空です。1件以上入力してください");
      return;
    }

    startConfirm(async () => {
      try {
        await createShoppingList(orderedItems);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setConfirmError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
  }

  if (step === "draft") {
    return (
      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">食材リスト(下書き)</h2>
          <button
            type="button"
            onClick={() => setStep("select")}
            className="text-sm text-emerald-700 hover:underline"
          >
            ← レシピ選択に戻る
          </button>
        </div>
        <p className="text-xs text-gray-500">
          カテゴリの見出し(⠿)をドラッグすると並び替えできます。数量・単位・カテゴリは直接編集できます。
        </p>

        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="space-y-4">
          {categoryOrder.map((category) => {
            const items = draftItems.filter((item) => item.category === category);
            if (items.length === 0) return null;
            return (
              <div
                key={category}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleCategoryDrop(category)}
                className={`rounded-lg border p-3 ${
                  draggingCategory === category ? "border-emerald-400" : "border-gray-200"
                }`}
              >
                <div
                  draggable
                  onDragStart={() => setDraggingCategory(category)}
                  className="mb-2 flex cursor-move items-center gap-2 text-sm font-semibold text-gray-600"
                >
                  <span>⠿</span>
                  <span>{category}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateDraftItem(item.key, { name: e.target.value })}
                        placeholder="食材名"
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        value={item.quantity ?? ""}
                        onChange={(e) =>
                          updateDraftItem(item.key, {
                            quantity: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="数量"
                        className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={item.unit ?? ""}
                        onChange={(e) => updateDraftItem(item.key, { unit: e.target.value })}
                        placeholder="単位"
                        className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        list="category-suggestions"
                        value={item.category}
                        onChange={(e) =>
                          updateDraftItem(item.key, { category: e.target.value || DEFAULT_CATEGORY })
                        }
                        placeholder="カテゴリ"
                        className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeDraftItem(item.key)}
                        className="px-2 text-sm text-gray-400 hover:text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addDraftItem}
          className="text-sm text-emerald-700 hover:underline"
        >
          + 食材を追加
        </button>

        {confirmError ? <p className="text-sm text-red-600">{confirmError}</p> : null}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isConfirming}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isConfirming ? "登録中..." : "買い物リストとして確定する"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">レシピを選択</label>
        {recipes.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            レシピが登録されていません。先にレシピを登録してください。
          </p>
        ) : (
          <div className="mt-2 space-y-2 rounded-md border border-gray-200 p-3">
            {recipes.map((recipe) => (
              <label key={recipe.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRecipeIds.has(recipe.id)}
                  onChange={() => toggleRecipe(recipe.id)}
                />
                <span>
                  {recipe.title}
                  <span className="ml-1 text-gray-400">
                    {[recipe.category, recipe.genre].filter(Boolean).join(" / ")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {neededIngredients.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            必要な食材(手持ちの分量があれば入力してください)
          </label>
          <div className="mt-2 space-y-2 rounded-md border border-gray-200 p-3">
            {neededIngredients.map((ingredient) => (
              <div key={ingredient.key} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {ingredient.name}
                  <span className="ml-2 text-gray-400">
                    必要: {ingredient.quantity != null ? ingredient.quantity : "適量"}
                    {ingredient.unit ?? ""}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-gray-400">手持ち</span>
                  <input
                    type="number"
                    value={ownedQuantities[ingredient.key] ?? ""}
                    onChange={(e) =>
                      setOwnedQuantities((prev) => ({ ...prev, [ingredient.key]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                  <span className="w-8 text-xs text-gray-400">{ingredient.unit ?? ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleGenerateDraft}
        disabled={selectedRecipeIds.size === 0}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        食材リストを作成
      </button>
    </div>
  );
}
