"use client";

import { useState, useTransition } from "react";
import { updateIngredientSeason } from "@/app/admin/seasons/actions";

export function SeasonEditRow({
  ingredientId,
  name,
  initialMonths,
}: {
  ingredientId: string;
  name: string;
  initialMonths: number[] | null;
}) {
  const [text, setText] = useState((initialMonths ?? []).join(","));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateIngredientSeason(ingredientId, text);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="min-w-[8rem] flex-1">{name}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        placeholder="例: 6,7,8"
        className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存"}
      </button>
      {saved ? <span className="text-xs text-brand-700">保存しました</span> : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </li>
  );
}
