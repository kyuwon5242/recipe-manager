"use client";

import { useActionState } from "react";
import { createGameCard, type CardFormState } from "@/app/admin/game-cards/actions";
import { CARD_RARITIES, RARITY_LABELS } from "@/lib/game/cards";

const initialState: CardFormState = { error: null };

export function GameCardCreateForm({
  candidates,
}: {
  candidates: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(createGameCard, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">食材</label>
        <select
          name="ingredient_id"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">選択してください</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">レアリティ</label>
        <select
          name="rarity"
          required
          defaultValue="normal"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {CARD_RARITIES.map((r) => (
            <option key={r} value={r}>
              {RARITY_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          画像ファイル名(<code>public/cards/</code>配下。未設定可)
        </label>
        <input
          type="text"
          name="illustration_url"
          placeholder="例: tomato.png"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">豆知識(こども向け・ひらがな中心)</label>
        <textarea
          name="trivia_kids_text"
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">豆知識(おとな向け・詳細)</label>
        <textarea
          name="trivia_adult_text"
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">栄養素メモ</label>
        <textarea
          name="nutrition_summary"
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
      >
        {isPending ? "作成中..." : "カードを作成"}
      </button>
    </form>
  );
}
