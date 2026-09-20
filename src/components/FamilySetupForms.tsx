"use client";

import { useActionState } from "react";
import {
  createFamilyAction,
  joinFamilyAction,
  type FamilySetupState,
} from "@/app/family/setup/actions";

const initialState: FamilySetupState = { error: null };

export function FamilySetupForms() {
  const [createState, createAction, isCreating] = useActionState(
    createFamilyAction,
    initialState
  );
  const [joinState, joinAction, isJoining] = useActionState(
    joinFamilyAction,
    initialState
  );

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">新しく家族を作成する</h2>
        <p className="mt-1 text-sm text-gray-500">
          あなたがownerとなり、招待コードで他の家族を招待できます。
        </p>
        <form action={createAction} className="mt-4 space-y-3">
          <input
            type="text"
            name="family_name"
            placeholder="例: 田中家"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {createState.error ? (
            <p className="text-sm text-red-600">{createState.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
          >
            {isCreating ? "作成中..." : "家族を作成"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">招待コードで参加する</h2>
        <p className="mt-1 text-sm text-gray-500">
          家族のownerから受け取った招待コードを入力してください。
        </p>
        <form action={joinAction} className="mt-4 space-y-3">
          <input
            type="text"
            name="invite_code"
            placeholder="例: AB12CD34"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          />
          {joinState.error ? (
            <p className="text-sm text-red-600">{joinState.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isJoining}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {isJoining ? "参加中..." : "参加する"}
          </button>
        </form>
      </section>
    </div>
  );
}
