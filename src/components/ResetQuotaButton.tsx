"use client";

import { useState, useTransition } from "react";
import { resetUserAiQuota } from "@/app/admin/ai-usage/actions";

export function ResetQuotaButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    const ok = confirm(`${userName}のAI利用上限を復活(今週分をリセット)させますか?`);
    if (!ok) return;
    startTransition(async () => {
      try {
        await resetUserAiQuota(userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "リセットに失敗しました");
      }
    });
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-brand-300 px-2 py-1 text-xs text-brand-700 hover:bg-brand-50 disabled:opacity-50"
      >
        {isPending ? "処理中..." : "復活させる"}
      </button>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
