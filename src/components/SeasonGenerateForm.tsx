"use client";

import { useActionState, useEffect } from "react";
import { generateSeasonMonths, type GenerateSeasonsState } from "@/app/admin/seasons/actions";

const initialState: GenerateSeasonsState = { result: null, error: null };

export function SeasonGenerateForm() {
  const [state, formAction, isPending] = useActionState(generateSeasonMonths, initialState);

  // 下の一覧(SeasonEditRow)はページ読み込み時の値をローカルstateで保持しているため、
  // 生成直後にAIの結果を確認できるよう、成功時はページを再読み込みして最新値を反映する。
  useEffect(() => {
    if (state.result && state.result.assignedCount > 0) {
      window.location.reload();
    }
  }, [state.result]);

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
        >
          {isPending ? "生成中...(数十秒かかる場合があります)" : "未設定の食材にAIで旬データを生成する"}
        </button>
      </form>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <div className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {state.result.targetCount === 0 ? (
            <p>旬データ未設定の食材はありませんでした(AIは呼び出していません)。</p>
          ) : (
            <p>
              未設定{state.result.targetCount}件中{state.result.assignedCount}件に旬データを設定しました。下の一覧で内容を確認・修正してください。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
