"use client";

import { useState, useTransition } from "react";
import { toggleUserSuspension, updateUserDisplayName } from "@/app/admin/actions";

export type AdminUserRowData = {
  id: string;
  email: string | null;
  displayName: string | null;
  familyName: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  isSelf: boolean;
};

export function AdminUserRow({ user }: { user: AdminUserRowData }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [isSavingName, startSaveName] = useTransition();
  const [isTogglingSuspend, startToggleSuspend] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSaveName() {
    setError(null);
    startSaveName(async () => {
      try {
        await updateUserDisplayName(user.id, displayName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    });
  }

  function handleToggleSuspend() {
    setError(null);
    if (!user.isSuspended) {
      const ok = confirm(`${user.displayName ?? user.email}を利用停止にしますか?`);
      if (!ok) return;
    }
    startToggleSuspend(async () => {
      try {
        await toggleUserSuspension(user.id, !user.isSuspended);
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    });
  }

  return (
    <li className="space-y-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSaveName}
            disabled={isSavingName}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            {isSavingName ? "保存中..." : "保存"}
          </button>
          {user.isAdmin ? (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
              admin
            </span>
          ) : null}
          {user.isSuspended ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              利用停止中
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <span>{user.email}</span>
          <span>{user.familyName ?? "所属家族なし"}</span>
          {!user.isSelf ? (
            <button
              type="button"
              onClick={handleToggleSuspend}
              disabled={isTogglingSuspend}
              className={`rounded-md border px-2 py-1 text-xs disabled:opacity-50 ${
                user.isSuspended
                  ? "border-brand-300 text-brand-700 hover:bg-brand-50"
                  : "border-red-300 text-red-600 hover:bg-red-50"
              }`}
            >
              {isTogglingSuspend ? "処理中..." : user.isSuspended ? "停止解除" : "利用停止"}
            </button>
          ) : (
            <span className="text-xs text-gray-300">(あなた)</span>
          )}
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </li>
  );
}
