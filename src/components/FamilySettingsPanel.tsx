"use client";

import { useActionState, useState, useTransition } from "react";
import {
  renameFamily,
  regenerateInviteCode,
  type FamilyActionState,
} from "@/app/family/actions";

const initialState: FamilyActionState = { error: null };

export function FamilySettingsPanel({
  familyId,
  familyName,
  inviteCode,
  isOwner,
}: {
  familyId: string;
  familyName: string;
  inviteCode: string;
  isOwner: boolean;
}) {
  const renameAction = renameFamily.bind(null, familyId);
  const [state, formAction, isPending] = useActionState(renameAction, initialState);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, startRegenerate] = useTransition();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">招待コード</h2>
        <p className="mt-1 text-sm text-gray-500">
          このコードを家族に共有すると、招待コードで参加できます。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-gray-100 px-3 py-1.5 text-lg tracking-widest">
            {inviteCode}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {copied ? "コピーしました" : "コピー"}
          </button>
          {isOwner ? (
            <button
              type="button"
              disabled={isRegenerating}
              onClick={() => startRegenerate(() => regenerateInviteCode(familyId))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {isRegenerating ? "再発行中..." : "コードを再発行"}
            </button>
          ) : null}
        </div>
      </div>

      {isOwner ? (
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold">家族の名前を変更</h2>
          <form action={formAction} className="mt-2 flex gap-2">
            <input
              type="text"
              name="family_name"
              defaultValue={familyName}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
          </form>
          {state.error ? (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
