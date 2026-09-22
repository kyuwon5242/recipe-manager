"use client";

import { useActionState } from "react";
import { updateAiQuotaLimit, type UpdateQuotaLimitState } from "@/app/admin/ai-usage/actions";

const initialState: UpdateQuotaLimitState = { error: null, success: false };

export function AiQuotaLimitForm({ weeklyLimitUsd }: { weeklyLimitUsd: number }) {
  const [state, formAction, isPending] = useActionState(updateAiQuotaLimit, initialState);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs text-gray-500">週間AI利用上限(1ユーザーあたり、概算USD)</label>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-sm text-gray-400">$</span>
          <input
            type="number"
            name="weekly_limit_usd"
            step="0.01"
            min="0.01"
            defaultValue={weeklyLimitUsd}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存する"}
      </button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
      {state.success ? <p className="w-full text-xs text-green-700">保存しました</p> : null}
    </form>
  );
}
