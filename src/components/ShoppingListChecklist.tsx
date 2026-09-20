"use client";

import { useState, useTransition } from "react";
import { toggleShoppingListItem } from "@/app/shopping-lists/actions";
import { sortByCategoryOrder } from "@/lib/ingredients/categories";
import type { ShoppingListItem } from "@/types/shopping-list";

export function ShoppingListChecklist({
  listId,
  items,
}: {
  listId: string;
  items: ShoppingListItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // カテゴリはスーパーの売り場順で固定表示する(店内を一筆書きで回れるように)。
  // カテゴリ内の並びは元のposition順を維持する。
  const categories: string[] = [];
  const grouped = new Map<string, ShoppingListItem[]>();
  for (const item of sortByCategoryOrder(items)) {
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
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 active:scale-95"
      >
        {copied ? "コピーしました" : "コピーする(LINEなどに貼り付け用)"}
      </button>

      {categories.map((category) => (
        <section key={category}>
          <h2 className="text-sm font-semibold text-gray-500">{category}</h2>
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {grouped.get(category)!.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      toggleShoppingListItem(item.id, listId, !item.is_checked);
                    })
                  }
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
                    item.is_checked ? "text-gray-400 line-through" : "hover:bg-gray-50"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="text-gray-400">
                    {[item.quantity, item.unit].filter(Boolean).join("")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
