"use client";

import { useState, useTransition } from "react";
import {
  addFamilyStore,
  deleteFamilyStore,
  renameFamilyStore,
  updateFamilyStoreCategoryOrder,
} from "@/app/family/actions";
import { MAX_FAMILY_STORES, type FamilyStore } from "@/types/shopping-settings";

function StoreRow({ store, isOwner }: { store: FamilyStore; isOwner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(store.name);
  const [order, setOrder] = useState(store.category_order);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    startTransition(async () => {
      try {
        await updateFamilyStoreCategoryOrder(store.id, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    });
  }

  function handleRename() {
    setError(null);
    startTransition(async () => {
      try {
        await renameFamilyStore(store.id, name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`「${store.name}」を削除しますか?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteFamilyStore(store.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  }

  return (
    <li className="rounded-md border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {isOwner ? (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleRename}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              保存
            </button>
          </>
        ) : (
          <span className="text-sm font-medium">{store.name}</span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-xs text-brand-700 hover:underline"
        >
          {expanded ? "並び順を閉じる" : "並び順を編集"}
        </button>
        {isOwner ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
          >
            削除
          </button>
        ) : null}
      </div>

      {expanded ? (
        <ol className="mt-3 space-y-1">
          {order.map((category, i) => (
            <li
              key={category}
              className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 text-sm"
            >
              <span>
                {i + 1}. {category}
              </span>
              {isOwner ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || isPending}
                    className="rounded border border-gray-300 px-1.5 py-0.5 text-xs disabled:opacity-30"
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1 || isPending}
                    className="rounded border border-gray-300 px-1.5 py-0.5 text-xs disabled:opacity-30"
                    title="下に移動"
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </li>
  );
}

export function FamilyStoreSettings({
  familyId,
  stores,
  isOwner,
}: {
  familyId: string;
  stores: FamilyStore[];
  isOwner: boolean;
}) {
  const [newName, setNewName] = useState("");
  const [isAdding, startAdd] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    setError(null);
    startAdd(async () => {
      try {
        await addFamilyStore(familyId, newName);
        setNewName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "追加に失敗しました");
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="font-semibold">よく使うスーパー</h2>
      <p className="mt-1 text-sm text-gray-500">
        スーパーごとに食材カテゴリの並び順を設定できます。買い物リストを作るときにスーパーを選ぶと、その並び順が使われます(最大{MAX_FAMILY_STORES}件)。
      </p>

      {stores.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">まだ登録されていません。</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {stores.map((store) => (
            <StoreRow key={store.id} store={store} isOwner={isOwner} />
          ))}
        </ul>
      )}

      {isOwner && stores.length < MAX_FAMILY_STORES ? (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: 近所のスーパー"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding || !newName.trim()}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
          >
            {isAdding ? "追加中..." : "追加"}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
