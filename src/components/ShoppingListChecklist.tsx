"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { bulkUpdateShoppingListItems } from "@/app/shopping-lists/actions";
import { sortByCategoryOrder, categoryIcon } from "@/lib/ingredients/categories";
import type { ShoppingListItem } from "@/types/shopping-list";

// タップごとに通信せず、少し待ってから未送信分をまとめて送る。
const SYNC_DEBOUNCE_MS = 1200;
const RETRY_DELAY_MS = 5000;

type SyncState = "idle" | "pending" | "saving" | "saved" | "error";

export function ShoppingListChecklist({
  listId,
  items,
  categoryOrder,
}: {
  listId: string;
  items: ShoppingListItem[];
  categoryOrder?: string[];
}) {
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.is_checked]))
  );
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

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

  function toggleItem(item: ShoppingListItem) {
    const nextChecked = !localChecked[item.id];
    setLocalChecked((prev) => ({ ...prev, [item.id]: nextChecked }));
    pendingRef.current.set(item.id, nextChecked);
    setSyncState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SYNC_DEBOUNCE_MS);
  }

  // カテゴリはスーパーの売り場順(このリストで指定されたスーパーの設定が
  // あればその順、無ければ標準の並び順)で固定表示する。
  // カテゴリ内の並びは元のposition順を維持する。
  const categories: string[] = [];
  const grouped = new Map<string, ShoppingListItem[]>();
  for (const item of sortByCategoryOrder(items, categoryOrder)) {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
      categories.push(item.category);
    }
    grouped.get(item.category)!.push(item);
  }

  async function handleCopy() {
    const text = categories
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

  if (items.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">食材が登録されていません。</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 active:scale-95"
        >
          {copied ? "コピーしました" : "コピーする(LINEなどに貼り付け用)"}
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

      {categories.map((category) => (
        <section key={category}>
          <h2 className="text-sm font-semibold text-gray-500">
            {categoryIcon(category)} {category}
          </h2>
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {grouped.get(category)!.map((item) => {
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
        </section>
      ))}
    </div>
  );
}
