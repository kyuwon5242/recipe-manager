"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createShoppingList,
  getMyShoppingListsForOverwrite,
  type CreateShoppingListItemInput,
  type ShoppingListSummary,
} from "@/app/shopping-list/actions";
import { SHOPPING_LIST_LIMIT_MESSAGE } from "@/lib/shopping/messages";
import { GENRE_TABS, bucketGenre } from "@/lib/recipe-genre";
import { getCategoryColor } from "@/lib/category-color";
import {
  INGREDIENT_CATEGORIES,
  UNCATEGORIZED_LABEL,
  sortByCategoryOrder,
} from "@/lib/ingredients/categories";
import {
  aggregateNeededIngredients,
  type AggregateIngredientInput,
  type AggregateRecipeInput,
  type NeededIngredient,
} from "@/lib/ingredients/aggregate";
import type { BuilderRecipe, DraftItem, InitialSelection } from "@/types/shopping-list";
import type { FamilyDefaultItem, FamilyStore } from "@/types/shopping-settings";
import { formatDateTime } from "@/lib/format-date";

const DEFAULT_CATEGORY = UNCATEGORIZED_LABEL;
const CATEGORY_SUGGESTIONS = [...INGREDIENT_CATEGORIES, DEFAULT_CATEGORY];
const RECIPE_TABS = ["すべて", ...GENRE_TABS] as const;

type OwnedEntry = { checked: boolean; quantity: string };

// 数量が入っておらず「少々」「適量」のような曖昧な表現の場合は、実質的に
// 確認不要な項目として控えめに表示する(忙しい人が見るべき項目だけに
// 目が行くようにするため)。
const NEGLIGIBLE_UNITS = new Set(["少々", "適量", "ひとつまみ", "お好み", "お好みで"]);
function isNegligibleSegment(seg: { quantity: number | null; unit: string | null }): boolean {
  return seg.quantity == null && (!seg.unit || NEGLIGIBLE_UNITS.has(seg.unit));
}

const STEP_LABELS = ["献立を選ぶ", "食材を確認", "買い物リスト"] as const;

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                done
                  ? "bg-brand-600 text-white"
                  : active
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {n}
            </span>
            <span
              className={
                active ? "font-medium text-brand-700" : done ? "text-gray-500" : "text-gray-400"
              }
            >
              {label}
            </span>
            {n < 3 ? <span className="mx-1 text-gray-300">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function StoreSelector({
  stores,
  selectedStoreId,
  onChange,
}: {
  stores: FamilyStore[];
  selectedStoreId: string;
  onChange: (id: string) => void;
}) {
  if (stores.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-gray-600">買い物するスーパー:</label>
      <select
        value={selectedStoreId}
        onChange={(e) => onChange(e.target.value)}
        title="選ぶとそのスーパーの並び順で買い物リストを作成します"
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="">指定なし(標準の並び順)</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function OverwritePicker({
  candidates,
  selectedId,
  onSelect,
  onConfirm,
  onCancel,
  isLoading,
  isSubmitting,
}: {
  candidates: ShoppingListSummary[] | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isSubmitting: boolean;
}) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-medium text-amber-800">
        買い物リストは1人3件までです。上書きするリストを選んでください。
      </p>
      {isLoading || !candidates ? (
        <p className="mt-2 text-gray-500">読み込み中...</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {candidates.map((list) => (
            <li key={list.id}>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="overwrite-target"
                  checked={selectedId === list.id}
                  onChange={() => onSelect(list.id)}
                />
                <span>
                  {list.title}({list.itemCount}品目・{formatDateTime(list.created_at)}作成)
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selectedId || isSubmitting}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : "選んだリストを上書きする"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

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
  stores = [],
  defaultItems = [],
}: {
  recipes: BuilderRecipe[];
  initialSelections?: InitialSelection[];
  stores?: FamilyStore[];
  defaultItems?: FamilyDefaultItem[];
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [overwriteCandidates, setOverwriteCandidates] = useState<ShoppingListSummary[] | null>(null);
  const [pendingItems, setPendingItems] = useState<CreateShoppingListItemInput[] | null>(null);
  const [selectedOverwriteId, setSelectedOverwriteId] = useState<string>("");
  const [isLoadingOverwrite, startLoadOverwrite] = useTransition();

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;
  const activeCategoryOrder = selectedStore?.category_order ?? INGREDIENT_CATEGORIES;
  // 献立トレイなどから選択済みの状態で遷移してきた場合は、冗長にならないよう
  // レシピ選択欄を畳んでおく。何も選択されていない通常アクセス時は開いたまま。
  const [showRecipePicker, setShowRecipePicker] = useState(initialSelections.length === 0);

  const currentStep: 1 | 2 | 3 = step === "draft" ? 3 : selectedRecipeIds.size > 0 ? 2 : 1;

  const visibleRecipes = useMemo(() => {
    const filtered =
      activeTab === "すべて"
        ? recipes
        : recipes.filter((recipe) => bucketGenre(recipe.genre) === activeTab);
    return [...filtered].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
  }, [recipes, activeTab]);

  const neededIngredients = useMemo<NeededIngredient[]>(() => {
    const selected = recipes.filter((recipe) => selectedRecipeIds.has(recipe.id));
    const recipeInputs: AggregateRecipeInput[] = selected.map((recipe) => ({
      servings: recipe.servings,
      targetServings: servingsTargets[recipe.id],
      ingredients: recipe.ingredients,
    }));
    if (defaultItems.length > 0) {
      const asIngredients: AggregateIngredientInput[] = defaultItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      }));
      recipeInputs.push({ servings: null, ingredients: asIngredients });
    }
    return aggregateNeededIngredients(recipeInputs);
  }, [selectedRecipeIds, recipes, servingsTargets, defaultItems]);

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
    setCategoryOrder(
      sortByCategoryOrder(
        Array.from(new Set(items.map((i) => i.category))).map((category) => ({ category })),
        activeCategoryOrder
      ).map((c) => c.category)
    );
    setConfirmError(null);
    setStep("draft");
  }

  // 買い物リストの件数上限に達した場合、上書き先を選べるようにする。
  // モデル任せではなく、ユーザーの明示的な選択があって初めて上書きが実行される。
  function submitShoppingList(items: CreateShoppingListItemInput[]) {
    startConfirm(async () => {
      try {
        await createShoppingList(items, { storeId: selectedStoreId || null });
      } catch (err) {
        if (isRedirectError(err)) throw err;
        if (err instanceof Error && err.message === SHOPPING_LIST_LIMIT_MESSAGE) {
          setPendingItems(items);
          startLoadOverwrite(async () => {
            try {
              const lists = await getMyShoppingListsForOverwrite();
              setOverwriteCandidates(lists);
            } catch (loadErr) {
              setConfirmError(loadErr instanceof Error ? loadErr.message : "取得に失敗しました");
            }
          });
          return;
        }
        setConfirmError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
  }

  function handleOverwriteConfirm() {
    if (!pendingItems || !selectedOverwriteId) return;
    startConfirm(async () => {
      try {
        await createShoppingList(pendingItems, {
          storeId: selectedStoreId || null,
          overwriteListId: selectedOverwriteId,
        });
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setConfirmError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
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

  function addDraftItem(targetCategory?: string) {
    const category = targetCategory ?? categoryOrder[0] ?? DEFAULT_CATEGORY;
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
    setOverwriteCandidates(null);
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

    submitShoppingList(orderedItems);
  }

  if (step === "draft") {
    return (
      <div className="mt-6 space-y-6">
        <StepIndicator current={currentStep} />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">買い物リスト(下書き)</h2>
          <button
            type="button"
            onClick={() => setStep("select")}
            className="text-sm text-brand-700 hover:underline"
          >
            ← レシピ選択に戻る
          </button>
        </div>
        <p className="text-xs text-gray-500">
          必要な食材をもとに買い物リストの下書きを作成しました。内容を確認・編集し、よろしければ下部のボタンで買い物リストとして確定してください。カテゴリの見出し(⠿)をドラッグすると並び替えできます。
        </p>

        <div className="space-y-4">
          {categoryOrder.map((category) => {
            const items = draftItems.filter((item) => item.category === category);
            if (items.length === 0) return null;
            return (
              <div
                key={category}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleCategoryDrop(category)}
                className={`rounded-lg border bg-white p-3 ${
                  draggingCategory === category ? "border-brand-400" : "border-gray-200"
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
                  {items.map((item) => {
                    const categoryOptions = CATEGORY_SUGGESTIONS.includes(item.category)
                      ? CATEGORY_SUGGESTIONS
                      : [item.category, ...CATEGORY_SUGGESTIONS];
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col gap-1.5 rounded-md border border-gray-100 p-2 sm:flex-row sm:items-center sm:border-0 sm:p-0"
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateDraftItem(item.key, { name: e.target.value })}
                          placeholder="食材名"
                          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:flex-1"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={item.quantity ?? ""}
                            onChange={(e) =>
                              updateDraftItem(item.key, {
                                quantity: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="数量"
                            className="w-16 min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:w-20 sm:flex-none"
                          />
                          <input
                            type="text"
                            value={item.unit ?? ""}
                            onChange={(e) => updateDraftItem(item.key, { unit: e.target.value })}
                            placeholder="単位"
                            className="w-12 min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:w-16 sm:flex-none"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => updateDraftItem(item.key, { category: e.target.value })}
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-1 py-1.5 text-sm sm:w-24 sm:flex-none"
                          >
                            {categoryOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeDraftItem(item.key)}
                            className="shrink-0 px-1 text-sm text-gray-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => addDraftItem(category)}
                  className="mt-2 text-xs text-brand-700 hover:underline"
                >
                  + この分類に追加
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => addDraftItem()}
          title="新しい分類の食材として追加します(あとでカテゴリ欄を書き換えられます)"
          className="text-sm text-brand-700 hover:underline"
        >
          + 食材を追加(新しい分類)
        </button>

        <StoreSelector stores={stores} selectedStoreId={selectedStoreId} onChange={setSelectedStoreId} />

        {confirmError ? <p className="text-sm text-red-600">{confirmError}</p> : null}

        {overwriteCandidates || isLoadingOverwrite ? (
          <OverwritePicker
            candidates={overwriteCandidates}
            selectedId={selectedOverwriteId}
            onSelect={setSelectedOverwriteId}
            onConfirm={handleOverwriteConfirm}
            onCancel={() => {
              setOverwriteCandidates(null);
              setPendingItems(null);
              setSelectedOverwriteId("");
            }}
            isLoading={isLoadingOverwrite}
            isSubmitting={isConfirming}
          />
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            title="この内容で買い物リストを保存し、家族に共有します"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
          >
            {isConfirming ? "登録中..." : "買い物リストとして確定する"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <StepIndicator current={currentStep} />
      <p className="text-xs text-gray-500">
        作る予定のレシピを選ぶと、必要な食材がリアルタイムで表示されます。手持ちの食材はチェックし、分量が分かれば入力してください(未入力の場合は足りているものとして扱います)。
      </p>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">レシピを選択</label>
          {recipes.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowRecipePicker((v) => !v)}
              className="text-xs text-brand-700 hover:underline"
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
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-white p-3">
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
                          {(() => {
                            const current =
                              servingsTargets[recipe.id] ??
                              (recipe.servings && recipe.servings > 0 ? recipe.servings : 1);
                            const servingsOptions = Array.from({ length: 12 }, (_, i) => i + 1);
                            if (!servingsOptions.includes(current)) servingsOptions.push(current);
                            return (
                              <select
                                value={current}
                                onChange={(e) =>
                                  setServingsTargets((prev) => ({
                                    ...prev,
                                    [recipe.id]: Number(e.target.value),
                                  }))
                                }
                                className="rounded-md border border-gray-300 px-1 py-1 text-sm"
                              >
                                {servingsOptions.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
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
                <div key={category} className="rounded-md border border-gray-200 bg-white p-3">
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
                  <div className="space-y-2">
                    {items.map((ingredient) => {
                      if (ingredient.segments.length === 1) {
                        const seg = ingredient.segments[0];
                        const owned = ownedState[seg.segmentKey] ?? { checked: false, quantity: "" };
                        const negligible = isNegligibleSegment(seg);
                        return (
                          <div key={ingredient.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <label className="flex flex-1 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={owned.checked}
                                onChange={() => toggleOwned(seg.segmentKey)}
                              />
                              <span className="font-medium text-gray-800">{ingredient.name}</span>
                              {negligible ? (
                                <span className="text-xs text-gray-300">{seg.unit || "適量"}</span>
                              ) : (
                                <span className="text-gray-400">
                                  必要: {seg.quantity}
                                  {seg.unit ?? ""}
                                </span>
                              )}
                            </label>
                            {owned.checked ? (
                              <div className="flex shrink-0 items-center gap-1">
                                <input
                                  type="number"
                                  value={owned.quantity}
                                  onChange={(e) => setOwnedQuantity(seg.segmentKey, e.target.value)}
                                  placeholder="分量(任意)"
                                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                />
                                <span className="w-8 text-xs text-gray-400">{seg.unit ?? ""}</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      }
                      return (
                        <div key={ingredient.key} className="text-sm">
                          <div className="font-medium text-gray-800">{ingredient.name}</div>
                          <div className="mt-1 space-y-1">
                            {ingredient.segments.map((seg) => {
                              const owned = ownedState[seg.segmentKey] ?? { checked: false, quantity: "" };
                              const negligible = isNegligibleSegment(seg);
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
                                    {negligible ? (
                                      <span className="text-xs text-gray-300">
                                        {seg.unit || "適量"}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">
                                        必要: {seg.quantity}
                                        {seg.unit ?? ""}
                                      </span>
                                    )}
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <StoreSelector stores={stores} selectedStoreId={selectedStoreId} onChange={setSelectedStoreId} />

      {confirmError ? <p className="text-sm text-red-600">{confirmError}</p> : null}

      {overwriteCandidates || isLoadingOverwrite ? (
        <OverwritePicker
          candidates={overwriteCandidates}
          selectedId={selectedOverwriteId}
          onSelect={setSelectedOverwriteId}
          onConfirm={handleOverwriteConfirm}
          onCancel={() => {
            setOverwriteCandidates(null);
            setPendingItems(null);
            setSelectedOverwriteId("");
          }}
          isLoading={isLoadingOverwrite}
          isSubmitting={isConfirming}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateDraft}
            disabled={selectedRecipeIds.size === 0}
            title="手持ちの食材を確認し、買い物リストの下書きを作ります"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
          >
            次に買い物リストを作成
          </button>
        </div>
      )}
    </div>
  );
}
