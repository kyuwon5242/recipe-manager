"use client";

import { useRef, useState, useTransition } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  addFamilyStore,
  deleteFamilyStore,
  renameFamilyStore,
  updateFamilyStoreCategoryOrder,
} from "@/app/family/actions";
import { MAX_FAMILY_STORES, type FamilyStore } from "@/types/shopping-settings";

// 長押し判定の時間(ms)と、長押し判定前に許容する移動量(px)。
// 短時間で指が動いた場合はスクロール操作とみなしてドラッグを発動しない。
const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 8;

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function StoreRow({ store, isOwner }: { store: FamilyStore; isOwner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(store.name);
  const [order, setOrder] = useState(store.category_order);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const dragInfo = useRef<{
    category: string;
    pointerId: number;
    startX: number;
    startY: number;
    armed: boolean;
    holdTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const isDirty = !arraysEqual(order, store.category_order);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function clearHoldTimer(info: NonNullable<typeof dragInfo.current>) {
    if (info.holdTimer) {
      clearTimeout(info.holdTimer);
      info.holdTimer = null;
    }
  }

  function endDrag(e: ReactPointerEvent<HTMLSpanElement>) {
    const info = dragInfo.current;
    if (!info) return;
    clearHoldTimer(info);
    if (info.armed) {
      try {
        e.currentTarget.releasePointerCapture(info.pointerId);
      } catch {
        // すでに解放済みの場合などは無視する
      }
    }
    dragInfo.current = null;
    setDraggingCategory(null);
  }

  function handleHandlePointerDown(e: ReactPointerEvent<HTMLSpanElement>, category: string) {
    if (!isOwner) return;
    const info = {
      category,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      armed: false,
      holdTimer: null as ReturnType<typeof setTimeout> | null,
    };
    dragInfo.current = info;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ポインターキャプチャに未対応の環境では無視する
    }
    info.holdTimer = setTimeout(() => {
      if (dragInfo.current === info) {
        info.armed = true;
        setDraggingCategory(category);
      }
    }, LONG_PRESS_MS);
  }

  function handleHandlePointerMove(e: ReactPointerEvent<HTMLSpanElement>) {
    const info = dragInfo.current;
    if (!info || info.pointerId !== e.pointerId) return;

    if (!info.armed) {
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearHoldTimer(info);
        dragInfo.current = null;
      }
      return;
    }

    e.preventDefault();
    const currentIndex = order.indexOf(info.category);
    if (currentIndex === -1) return;

    let hoverIndex = rowRefs.current.length - 1;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        hoverIndex = i;
        break;
      }
    }

    if (hoverIndex !== currentIndex) {
      reorder(currentIndex, hoverIndex);
    }
  }

  function handleSaveOrder() {
    setError(null);
    startSaving(async () => {
      try {
        await updateFamilyStoreCategoryOrder(store.id, order);
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
        <div className="mt-3">
          {isOwner ? (
            <p className="text-xs text-gray-400">
              ↑↓で並べ替え、またはスマホでは⠿を長押ししてドラッグで並べ替えできます。並べ替えたら「確定」を押すと保存されます。
            </p>
          ) : null}
          <ol className="mt-2 space-y-1">
            {order.map((category, i) => (
              <li
                key={category}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-sm transition ${
                  draggingCategory === category ? "bg-brand-50 ring-2 ring-brand-300" : "bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  {isOwner ? (
                    <span
                      onPointerDown={(e) => handleHandlePointerDown(e, category)}
                      onPointerMove={handleHandlePointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      style={{ touchAction: "none" }}
                      className={`cursor-grab select-none px-1 text-gray-400 ${
                        draggingCategory === category ? "cursor-grabbing text-brand-600" : ""
                      }`}
                    >
                      ⠿
                    </span>
                  ) : null}
                  <span>
                    {i + 1}. {category}
                  </span>
                </span>
                {isOwner ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded border border-gray-300 px-1.5 py-0.5 text-xs disabled:opacity-30"
                      title="上に移動"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
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

          {isOwner ? (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={!isDirty || isSaving}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? "確定中..." : "並び順を確定"}
              </button>
              {isDirty ? (
                <button
                  type="button"
                  onClick={() => setOrder(store.category_order)}
                  disabled={isSaving}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  元に戻す
                </button>
              ) : (
                <span className="text-xs text-gray-400">保存済み</span>
              )}
            </div>
          ) : null}
        </div>
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
