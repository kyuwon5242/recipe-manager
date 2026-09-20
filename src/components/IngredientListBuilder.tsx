"use client";

import { useMemo, useState, useTransition } from "react";
import { createShoppingList } from "@/app/shopping-list/actions";
import { GENRE_TABS, bucketGenre } from "@/lib/recipe-genre";
import { getCategoryColor } from "@/lib/category-color";
import { INGREDIENT_CATEGORIES, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { formatBaseQuantity, normalizeUnit, type UnitGroup } from "@/lib/ingredients/units";
import type { BuilderRecipe, DraftItem, InitialSelection } from "@/types/shopping-list";

const DEFAULT_CATEGORY = UNCATEGORIZED_LABEL;
const CATEGORY_SUGGESTIONS = [...INGREDIENT_CATEGORIES, DEFAULT_CATEGORY];
const RECIPE_TABS = ["すべて", ...GENRE_TABS] as const;

// 同じ食材でもレシピによって単位がバラバラなことがある(人参の「240g」と
// 「1本」、みりんの「大さじ」と「小さじ」など)。g/kg・ml/大さじ/小さじ等の
// 換算可能な単位は合算した1つの数量にまとめ、「1本」のような個数単位は
// 換算できないため、同じ食材名の下に別セグメントとして並べて表示する。
type QuantitySegment = {
  segmentKey: string;
  quantity: number | null;
  unit: string | null;
};

type NeededIngredient = {
  key: string;
  name: string;
  category: string;
  segments: QuantitySegment[];
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
  initialSelections = [],
}: {
  recipes: BuilderRecipe[];
  initialSelections?: InitialSelection[];
}) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(
    () => new Set(initialSelections.map((s) => s.id))
  );
  const [servingsTargets, setServingsTargets] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const selection of initialSelections) {
      if (selection.servings != null) {
        initial[selection.id] = selection.servings;
      }
    }
    return initial;
  });
  const [ownedState, setOwnedState] = useState<Record<string, OwnedEntry>>({});
  const [activeTab, setActiveTab] = useState<(typeof RECIPE_TABS)[number]>("すべて");
  const [step, setStep] = useState<"select" | "draft">("select");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, startConfirm] = useTransition();
  // 献立トレイなどから選択済みの状態で遷移してきた場合は、冗長にならないよう
  // レシピ選択欄を畳んでおく。何も選択されていない通常アクセス時は開いたまま。
  const [showRecipePicker, setShowRecipePicker] = useState(initialSelections.length === 0);

  const visibleRecipes = useMemo(() => {
    const filtered =
      activeTab === "すべて"
        ? recipes
        : recipes.filter((recipe) => bucketGenre(recipe.genre) === activeTab);
    return [...filtered].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
  }, [recipes, activeTab]);

  const neededIngredients = useMemo<NeededIngredient[]>(() => {
    type Accumulator = { quantity: number | null; unit: string | null; group?: UnitGroup };
    const order: string[] = [];
    const byName = new Map<string, { category: string; segments: Map<string, Accumulator> }>();

    for (const recipe of recipes) {
      if (!selectedRecipeIds.has(recipe.id)) continue;
      const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
      const target = servingsTargets[recipe.id] ?? baseServings ?? 1;
      const multiplier = baseServings ? target / baseServings : 1;

      for (const ingredient of recipe.ingredients) {
        const name = ingredient.name;
        if (!byName.has(name)) {
          byName.set(name, { category: ingredient.category ?? DEFAULT_CATEGORY, segments: new Map() });
          order.push(name);
        }
        const entry = byName.get(name)!;
        const scaledQuantity = ingredient.quantity != null ? ingredient.quantity * multiplier : null;
        const normalized = normalizeUnit(ingredient.unit);
        const segKey = normalized ? normalized.group : ingredient.unit ?? "";
        const addedValue =
          normalized && scaledQuantity != null ? scaledQuantity * normalized.factor : scaledQuantity;

        const existing = entry.segments.get(segKey);
        if (existing) {
          existing.quantity =
            existing.quantity != null && addedValue != null ? existing.quantity + addedValue : null;
        } else {
          entry.segments.set(segKey, {
            quantity: addedValue,
            unit: normalized ? null : ingredient.unit,
            group: normalized?.group,
          });
        }
      }
    }

    return order.map((name) => {
      const entry = byName.get(name)!;
      const segments: QuantitySegment[] = Array.from(entry.segments.entries()).map(([segKey, seg]) => {
        if (seg.group) {
          const formatted = seg.quantity != null ? formatBaseQuantity(seg.group, seg.quantity) : null;
          return {
            segmentKey: `${name}__${segKey}`,
            quantity: formatted?.quantity ?? null,
            unit: formatted?.unit ?? (seg.group === "weight" ? "g" : "ml"),
          };
        }
        return { segmentKey: `${name}__${segKey}`, quantity: seg.quantity, unit: seg.unit };
      });
      return { key: name, name, category: entry.category, segments };
    });
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

  function isCategoryFullyOwned(items: NeededIngredient[]): boolean {
    return items.every((ing) => ing.segments.every((seg) => ownedState[seg.segmentKey]?.checked));
  }

  function toggleCategoryOwned(items: NeededIngredient[]) {
    const nextChecked = !isCategoryFullyOwned(items);
    setOwnedState((prev) => {
      const next = { ...prev };
      for (const ing of items) {
        for (const seg of ing.segments) {
          next[seg.segmentKey] = { checked: nextChecked, quantity: "" };
        }
      }
      return next;
    });
  }

  function handleGenerateDraft() {
    const items: DraftItem[] = [];
    for (const ingredient of neededIngredients) {
      for (const seg of ingredient.segments) {
        const owned = ownedState[seg.segmentKey];
        if (owned?.checked) {
          const qtyRaw = owned.quantity.trim();
          if (!qtyRaw || seg.quantity == null) {
            continue;
          }
          const shortfall = seg.quantity - Number(qtyRaw);
          if (shortfall > 0) {
            items.push({
              key: crypto.randomUUID(),
              name: ingredient.name,
              quantity: shortfall,
              unit: seg.unit,
              category: ingredient.category,
            });
          }
          continue;
        }
        items.push({
          key: crypto.randomUUID(),
          name: ingredient.name,
          quantity: seg.quantity,
          unit: seg.unit,
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
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">レシピを選択</label>
          {recipes.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowRecipePicker((v) => !v)}
              className="text-xs text-emerald-700 hover:underline"
            >
              {showRecipePicker ? "閉じる" : "変更する"}
            </button>
          ) : null}
        </div>
        {recipes.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            レシピが登録されていません。先にレシピを登録してください。
          </p>
        ) : showRecipePicker ? (
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
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
              {visibleRecipes.length === 0 ? (
                <p className="text-sm text-gray-500">該当するレシピがありません。</p>
              ) : (
                visibleRecipes.map((recipe) => {
                  const isSelected = selectedRecipeIds.has(recipe.id);
                  const color = getCategoryColor(recipe.category);
                  return (
                    <div key={recipe.id} className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecipe(recipe.id, recipe)}
                        />
                        <span>
                          {recipe.is_favorite ? (
                            <span className="mr-1 text-red-500">♥</span>
                          ) : null}
                          {recipe.title}
                          {recipe.category ? (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
                            >
                              {recipe.category}
                            </span>
                          ) : null}
                          {recipe.genre ? (
                            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              {recipe.genre}
                            </span>
                          ) : null}
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
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            {selectedRecipeIds.size > 0
              ? `${selectedRecipeIds.size}件のレシピを選択中です。`
              : "レシピが選択されていません。"}
          </p>
        )}
      </div>

      {neededByCategory.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            必要な食材(手持ちがあればチェックし、分量が分かれば入力してください)
          </label>
          <div className="mt-2 space-y-4">
            {neededByCategory.map(({ category, items }) => {
              const fullyOwned = isCategoryFullyOwned(items);
              return (
                <div key={category} className="rounded-md border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-500">{category}</h3>
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={fullyOwned}
                        onChange={() => toggleCategoryOwned(items)}
                      />
                      すべて持っている
                    </label>
                  </div>
                  <div className="space-y-3">
                    {items.map((ingredient) => (
                      <div key={ingredient.key} className="text-sm">
                        <div className="font-medium text-gray-800">{ingredient.name}</div>
                        <div className="mt-1 space-y-1">
                          {ingredient.segments.map((seg) => {
                            const owned = ownedState[seg.segmentKey] ?? { checked: false, quantity: "" };
                            return (
                              <div
                                key={seg.segmentKey}
                                className="flex items-center justify-between gap-2"
                              >
                                <label className="flex flex-1 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={owned.checked}
                                    onChange={() => toggleOwned(seg.segmentKey)}
                                  />
                                  <span className="text-gray-400">
                                    必要:{" "}
                                    {seg.quantity != null
                                      ? `${seg.quantity}${seg.unit ?? ""}`
                                      : seg.unit || "適量"}
                                  </span>
                                </label>
                                {owned.checked ? (
                                  <div className="flex shrink-0 items-center gap-1">
                                    <input
                                      type="number"
                                      value={owned.quantity}
                                      onChange={(e) => setOwnedQuantity(seg.segmentKey, e.target.value)}
                                      placeholder="分量(任意)"
                                      className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                    />
                                    <span className="w-8 text-xs text-gray-400">{seg.unit ?? ""}</span>
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
              );
            })}
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
