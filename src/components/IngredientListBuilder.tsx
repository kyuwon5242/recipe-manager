"use client";

import { useMemo, useState, useTransition } from "react";
import { createShoppingList } from "@/app/shopping-list/actions";
import { GENRE_TABS, bucketGenre } from "@/lib/recipe-genre";
import type { BuilderRecipe, DraftItem } from "@/types/shopping-list";

const DEFAULT_CATEGORY = "未分類";
const CATEGORY_SUGGESTIONS = ["野菜", "肉・魚", "調味料", "乳製品・卵", "主食", DEFAULT_CATEGORY];
const RECIPE_TABS = ["すべて", ...GENRE_TABS] as const;

type NeededIngredient = {
  key: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

type OwnedEntry = { checked: boolean; quantity: string };

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function IngredientListBuilder({
  recipes,
  initialSelectedIds = [],
}: {
  recipes: BuilderRecipe[];
  initialSelectedIds?: string[];
}) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [servingsTargets, setServingsTargets] = useState<Record<string, number>>({});
  const [ownedState, setOwnedState] = useState<Record<string, OwnedEntry>>({});
  const [activeTab, setActiveTab] = useState<(typeof RECIPE_TABS)[number]>("すべて");
  const [step, setStep] = useState<"select" | "draft">("select");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, startConfirm] = useTransition();

  const visibleRecipes = useMemo(() => {
    if (activeTab === "すべて") return recipes;
    return recipes.filter((recipe) => bucketGenre(recipe.genre) === activeTab);
  }, [recipes, activeTab]);

  const neededIngredients = useMemo<NeededIngredient[]>(() => {
    const map = new Map<string, NeededIngredient>();
    for (const recipe of recipes) {
      if (!selectedRecipeIds.has(recipe.id)) continue;
      const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
      const target = servingsTargets[recipe.id] ?? baseServings ?? 1;
      const multiplier = baseServings ? target / baseServings : 1;

      for (const ingredient of recipe.ingredients) {
        const key = `${ingredient.name}__${ingredient.unit ?? ""}`;
        const scaledQuantity = ingredient.quantity != null ? ingredient.quantity * multiplier : null;
        const existing = map.get(key);
        if (existing) {
          if (existing.quantity != null && scaledQuantity != null) {
            existing.quantity += scaledQuantity;
          } else {
            existing.quantity = null;
          }
        } else {
          map.set(key, {
            key,
            name: ingredient.name,
            quantity: scaledQuantity,
            unit: ingredient.unit,
            category: ingredient.category ?? DEFAULT_CATEGORY,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [selectedRecipeIds, recipes, servingsTargets]);

  const neededByCategory = useMemo(() => {
    const order: string[] = [];
    const grouped = new Map<string, NeededIngredient[]>();
    for (const ingredient of neededIngredients) {
      if (!grouped.has(ingredient.category)) {
        grouped.set(ingredient.category, []);
        order.push(ingredient.category);
      }
      grouped.get(ingredient.category)!.push(ingredient);
    }
    return order.map((category) => ({ category, items: grouped.get(category)! }));
  }, [neededIngredients]);

  function toggleRecipe(id: string, recipe: BuilderRecipe) {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setServingsTargets((prevTargets) =>
          prevTargets[id] != null
            ? prevTargets
            : { ...prevTargets, [id]: recipe.servings && recipe.servings > 0 ? recipe.servings : 1 }
        );
      }
      return next;
    });
  }

  function toggleOwned(key: string) {
    setOwnedState((prev) => {
      const current = prev[key] ?? { checked: false, quantity: "" };
      return { ...prev, [key]: { ...current, checked: !current.checked } };
    });
  }

  function setOwnedQuantity(key: string, value: string) {
    setOwnedState((prev) => ({ ...prev, [key]: { checked: true, quantity: value } }));
  }

  function handleGenerateDraft() {
    const items: DraftItem[] = [];
    for (const ingredient of neededIngredients) {
      const owned = ownedState[ingredient.key];
      if (owned?.checked) {
        const qtyRaw = owned.quantity.trim();
        if (!qtyRaw || ingredient.quantity == null) {
          continue;
        }
        const shortfall = ingredient.quantity - Number(qtyRaw);
        if (shortfall > 0) {
          items.push({
            key: crypto.randomUUID(),
            name: ingredient.name,
            quantity: shortfall,
            unit: ingredient.unit,
            category: ingredient.category,
          });
        }
        continue;
      }
      items.push({
        key: crypto.randomUUID(),
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category,
      });
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
          <>
            <div className="mt-2 flex flex-wrap gap-2 border-b border-gray-200">
              {RECIPE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-3 py-1.5 text-sm font-medium ${
                    activeTab === tab
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-2 rounded-md border border-gray-200 p-3">
              {visibleRecipes.length === 0 ? (
                <p className="text-sm text-gray-500">該当するレシピがありません。</p>
              ) : (
                visibleRecipes.map((recipe) => {
                  const isSelected = selectedRecipeIds.has(recipe.id);
                  return (
                    <div key={recipe.id} className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecipe(recipe.id, recipe)}
                        />
                        <span>
                          {recipe.title}
                          <span className="ml-1 text-gray-400">
                            {[recipe.category, recipe.genre].filter(Boolean).join(" / ")}
                          </span>
                        </span>
                      </label>
                      {isSelected ? (
                        <div className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
                          <span>人前</span>
                          <input
                            type="number"
                            min={1}
                            value={
                              servingsTargets[recipe.id] ??
                              (recipe.servings && recipe.servings > 0 ? recipe.servings : 1)
                            }
                            onChange={(e) =>
                              setServingsTargets((prev) => ({
                                ...prev,
                                [recipe.id]: Number(e.target.value) || 1,
                              }))
                            }
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {neededByCategory.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            必要な食材(手持ちがあればチェックし、分量が分かれば入力してください)
          </label>
          <div className="mt-2 space-y-4">
            {neededByCategory.map(({ category, items }) => (
              <div key={category} className="rounded-md border border-gray-200 p-3">
                <h3 className="mb-2 text-xs font-semibold text-gray-500">{category}</h3>
                <div className="space-y-2">
                  {items.map((ingredient) => {
                    const owned = ownedState[ingredient.key] ?? { checked: false, quantity: "" };
                    return (
                      <div
                        key={ingredient.key}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <label className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={owned.checked}
                            onChange={() => toggleOwned(ingredient.key)}
                          />
                          <span>
                            {ingredient.name}
                            <span className="ml-2 text-gray-400">
                              必要: {ingredient.quantity != null ? ingredient.quantity : "適量"}
                              {ingredient.unit ?? ""}
                            </span>
                          </span>
                        </label>
                        {owned.checked ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <input
                              type="number"
                              value={owned.quantity}
                              onChange={(e) => setOwnedQuantity(ingredient.key, e.target.value)}
                              placeholder="分量(任意)"
                              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                            <span className="w-8 text-xs text-gray-400">{ingredient.unit ?? ""}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
