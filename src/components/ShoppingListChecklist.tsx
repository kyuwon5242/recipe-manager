"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  bulkUpdateShoppingListItems,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  updateShoppingListMemo,
  type ShoppingListItemInput,
} from "@/app/shopping-lists/actions";
import { sortByCategoryOrder, categoryIcon, INGREDIENT_CATEGORIES, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { isCountUnit, countQuantityOptionsFor } from "@/lib/ingredients/units";
import type { ShoppingListItem } from "@/types/shopping-list";

// タップごとに通信せず、少し待ってから未送信分をまとめて送る。
const SYNC_DEBOUNCE_MS = 1200;
const RETRY_DELAY_MS = 5000;
const CATEGORY_SUGGESTIONS = [...INGREDIENT_CATEGORIES, UNCATEGORIZED_LABEL];

type SyncState = "idle" | "pending" | "saving" | "saved" | "error";

export function ShoppingListChecklist({
  listId,
  items,
  categoryOrder,
  initialMemo = null,
}: {
  listId: string;
  items: ShoppingListItem[];
  categoryOrder?: string[];
  initialMemo?: string | null;
}) {
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.is_checked]))
  );
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const pendingRef = useRef<Map<string, boolean>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // サーバーから新しいitems(revalidatePath後など)が来たら反映する。ただし
  // まだ送信していない変更(pendingRef)がある項目は、送信が終わるまで
  // ローカルの表示を優先して上書きしない。
  useEffect(() => {
    setLocalChecked((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (!pendingRef.current.has(item.id)) {
          next[item.id] = item.is_checked;
        }
      }
      return next;
    });
  }, [items]);

  function flush() {
    if (pendingRef.current.size === 0) return;
    const updates = Array.from(pendingRef.current.entries()).map(([id, is_checked]) => ({
      id,
      is_checked,
    }));
    pendingRef.current = new Map();
    setSyncState("saving");
    startTransition(async () => {
      try {
        await bulkUpdateShoppingListItems(listId, updates);
        setSyncState("saved");
        setTimeout(() => setSyncState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch {
        // 失敗した分は未送信キューに戻し、自動で再送する。ただし、送信を
        // 待っている間にユーザーが同じ項目を再度タップしていた場合は、
        // その新しい値を優先し、失敗した古い値で上書きしない。
        for (const u of updates) {
          if (!pendingRef.current.has(u.id)) {
            pendingRef.current.set(u.id, u.is_checked);
          }
        }
        setSyncState("error");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, RETRY_DELAY_MS);
      }
    });
  }

  // 画面を離れるとき(遷移など)は、待ち時間を待たず未送信分を即座に送る。
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current.size > 0) {
        const updates = Array.from(pendingRef.current.entries()).map(([id, is_checked]) => ({
          id,
          is_checked,
        }));
        pendingRef.current = new Map();
        bulkUpdateShoppingListItems(listId, updates).catch(() => {
          // ページを離脱する最中の失敗は表示できないため諦める
        });
      }
    };
    // マウント時に1回だけ登録するクリーンアップなので依存配列は空でよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleItem = useCallback((item: ShoppingListItem) => {
    const nextChecked = !localChecked[item.id];
    setLocalChecked((prev) => ({ ...prev, [item.id]: nextChecked }));
    pendingRef.current.set(item.id, nextChecked);
    setSyncState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SYNC_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localChecked]);

  // --- メモ(リスト全体で1つ) ---
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [memoSyncState, setMemoSyncState] = useState<SyncState>("idle");
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMemoChange(value: string) {
    setMemo(value);
    setMemoSyncState("pending");
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(() => {
      setMemoSyncState("saving");
      startTransition(async () => {
        try {
          await updateShoppingListMemo(listId, value.trim() || null);
          setMemoSyncState("saved");
          setTimeout(() => setMemoSyncState((s) => (s === "saved" ? "idle" : s)), 1500);
        } catch {
          setMemoSyncState("error");
        }
      });
    }, SYNC_DEBOUNCE_MS);
  }

  // --- 項目の編集(名前・数量・単位・分類)・追加・削除 ---
  // 送信済みの値(items prop)に、未送信のローカル編集だけを重ねて表示する。
  const [fieldEdits, setFieldEdits] = useState<Record<string, Partial<ShoppingListItemInput>>>({});
  // setTimeoutのコールバック(render外)で最新の未送信編集を読むための、
  // fieldEditsとは独立した素のref(イベントハンドラ内でのみ読み書きする)。
  const pendingEditsRef = useRef<Record<string, Partial<ShoppingListItemInput>>>({});
  const itemTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [addingCategory, setAddingCategory] = useState<string | null>(null);

  function editedItem(item: ShoppingListItem): ShoppingListItem {
    const edit = fieldEdits[item.id];
    return edit ? { ...item, ...edit } : item;
  }

  // 保存が成功したフィールドだけローカルの上書きを消し、以後はサーバーから
  // 届く最新のitems propを信頼できるようにする(保存に使った値と、保存後に
  // 届くprop値は同じはずなので、見た目上のちらつきは起きない)。
  function clearSavedFields(itemId: string, savedKeys: (keyof ShoppingListItemInput)[]) {
    setFieldEdits((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const rest = { ...current };
      for (const key of savedKeys) delete rest[key];
      const next = { ...prev };
      if (Object.keys(rest).length > 0) next[itemId] = rest;
      else delete next[itemId];
      return next;
    });
  }

  const setFieldEdit = useCallback((itemId: string, patch: Partial<ShoppingListItemInput>) => {
    const merged = { ...pendingEditsRef.current[itemId], ...patch };
    pendingEditsRef.current[itemId] = merged;
    setFieldEdits((prev) => ({ ...prev, [itemId]: merged }));
    if (itemTimersRef.current[itemId]) clearTimeout(itemTimersRef.current[itemId]);
    itemTimersRef.current[itemId] = setTimeout(() => {
      const edit = pendingEditsRef.current[itemId];
      if (!edit) return;
      delete pendingEditsRef.current[itemId];
      startTransition(async () => {
        try {
          await updateShoppingListItem(listId, itemId, edit);
          clearSavedFields(itemId, Object.keys(edit) as (keyof ShoppingListItemInput)[]);
        } catch {
          // 失敗時はローカルの編集値をそのまま残し、次回フィールド編集時に再送を試みる
        }
      });
    }, SYNC_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveFieldImmediately(itemId: string, patch: Partial<ShoppingListItemInput>) {
    delete pendingEditsRef.current[itemId];
    setFieldEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
    if (itemTimersRef.current[itemId]) clearTimeout(itemTimersRef.current[itemId]);
    startTransition(async () => {
      try {
        await updateShoppingListItem(listId, itemId, patch);
        clearSavedFields(itemId, Object.keys(patch) as (keyof ShoppingListItemInput)[]);
      } catch {
        // 失敗時はローカルの編集値をそのまま残す
      }
    });
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      try {
        await deleteShoppingListItem(listId, itemId);
      } catch {
        // 失敗時は何もしない(一覧はそのまま残り、再度削除を試せる)
      }
    });
  }

  function handleAddItem(category: string) {
    setAddingCategory(category);
    startTransition(async () => {
      try {
        await addShoppingListItem(listId, { name: "", quantity: null, unit: null, category });
      } finally {
        setAddingCategory(null);
      }
    });
  }

  // カテゴリはスーパーの売り場順(このリストで指定されたスーパーの設定が
  // あればその順、無ければ標準の並び順)で固定表示する。
  // カテゴリ内の並びは元のposition順を維持する。
  const categories: string[] = [...(categoryOrder ?? INGREDIENT_CATEGORIES)];
  const grouped = new Map<string, ShoppingListItem[]>();
  for (const item of sortByCategoryOrder(items, categoryOrder)) {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
      if (!categories.includes(item.category)) categories.push(item.category);
    }
    grouped.get(item.category)!.push(item);
  }
  const visibleCategories = editMode ? categories : categories.filter((c) => grouped.has(c));

  async function handleCopy() {
    const text = categories
      .filter((category) => grouped.has(category))
      .map((category) => {
        const lines = grouped
          .get(category)!
          .map((item) => `・${item.name}${[item.quantity, item.unit].filter(Boolean).join("")}`)
          .join("\n");
        return `【${category}】\n${lines}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では諦める
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">メモ</label>
          <span className="text-xs text-gray-400" aria-live="polite">
            {memoSyncState === "saving"
              ? "保存中..."
              : memoSyncState === "saved"
                ? "保存しました"
                : memoSyncState === "error"
                  ? "保存に失敗しました"
                  : ""}
          </span>
        </div>
        <textarea
          value={memo}
          onChange={(e) => handleMemoChange(e.target.value)}
          rows={2}
          placeholder="例: 特売になったら多めに買う、〇〇スーパー限定の商品で、など"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 active:scale-95"
        >
          {copied ? "コピーしました" : "コピーする(LINEなどに貼り付け用)"}
        </button>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
            editMode
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          {editMode ? "編集を終える" : "✎ 編集する"}
        </button>
        <span className="text-xs text-gray-400" aria-live="polite">
          {syncState === "saving"
            ? "保存中..."
            : syncState === "saved"
              ? "保存しました"
              : syncState === "error"
                ? "保存に失敗しました。自動で再試行します..."
                : syncState === "pending"
                  ? "まもなく保存します..."
                  : ""}
        </span>
      </div>

      {items.length === 0 && !editMode ? (
        <p className="text-sm text-gray-500">食材が登録されていません。「編集する」から追加できます。</p>
      ) : (
        visibleCategories.map((category) => {
          const categoryItems = grouped.get(category) ?? [];
          if (!editMode && categoryItems.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="text-sm font-semibold text-gray-500">
                {categoryIcon(category)} {category}
              </h2>
              {editMode ? (
                <div className="mt-2 space-y-2 rounded-md border border-gray-200 bg-white p-3">
                  {categoryItems.map((rawItem) => {
                    const item = editedItem(rawItem);
                    const categoryOptions = CATEGORY_SUGGESTIONS.includes(item.category)
                      ? CATEGORY_SUGGESTIONS
                      : [item.category, ...CATEGORY_SUGGESTIONS];
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-1.5 rounded-md border border-gray-100 p-2 sm:flex-row sm:items-center sm:border-0 sm:p-0"
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => setFieldEdit(item.id, { name: e.target.value })}
                          placeholder="食材名"
                          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:flex-1"
                        />
                        <div className="flex items-center gap-1.5">
                          {isCountUnit(item.unit) ? (
                            <select
                              value={item.quantity ?? ""}
                              onChange={(e) =>
                                saveFieldImmediately(item.id, {
                                  quantity: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="w-16 min-w-0 flex-1 rounded-md border border-gray-300 px-1 py-1.5 text-sm sm:w-20 sm:flex-none"
                            >
                              <option value="">数量</option>
                              {countQuantityOptionsFor(item.quantity).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              value={item.quantity ?? ""}
                              onChange={(e) =>
                                setFieldEdit(item.id, {
                                  quantity: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              placeholder="数量"
                              className="w-16 min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:w-20 sm:flex-none"
                            />
                          )}
                          <input
                            type="text"
                            value={item.unit ?? ""}
                            onChange={(e) => setFieldEdit(item.id, { unit: e.target.value })}
                            placeholder="単位"
                            className="w-12 min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:w-16 sm:flex-none"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => saveFieldImmediately(item.id, { category: e.target.value })}
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
                            onClick={() => handleDeleteItem(item.id)}
                            className="shrink-0 px-1 text-sm text-gray-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleAddItem(category)}
                    disabled={addingCategory === category}
                    className="mt-1 text-xs text-brand-700 hover:underline disabled:opacity-50"
                  >
                    + この分類に追加
                  </button>
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
                  {categoryItems.map((item) => {
                    const checked = localChecked[item.id] ?? item.is_checked;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggleItem(item)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                            checked ? "text-gray-400 line-through" : "hover:bg-gray-50"
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className="text-gray-400">
                            {[item.quantity, item.unit].filter(Boolean).join("")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
