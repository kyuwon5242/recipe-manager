"use client";

import { useState, useTransition } from "react";
import { updateGameCard, deleteGameCard } from "@/app/admin/game-cards/actions";
import { GameCardVisual } from "@/components/GameCardVisual";
import { CARD_RARITIES, RARITY_LABELS, monthsLabel, type CardRarity } from "@/lib/game/cards";
import { categoryIcon } from "@/lib/ingredients/categories";

export type EditableCard = {
  id: string;
  ingredientId: string;
  name: string;
  category: string;
  rarity: CardRarity;
  illustrationUrl: string | null;
  seasonMonths: number[] | null;
  reading: string | null;
  triviaKidsText: string | null;
  triviaAdultText: string | null;
  nutritionSummary: string | null;
};

export function GameCardEditForm({ card }: { card: EditableCard }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateGameCard(card.id, card.ingredientId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setExpanded(false);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`「${card.name}」のカードを削除しますか?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteGameCard(card.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="rounded-lg border-2 border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="w-14 shrink-0">
          <GameCardVisual
            category={card.category}
            rarity={card.rarity}
            src={null}
            alt={card.name}
            isOwned={false}
            iconClassName="text-xl"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{card.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <span aria-hidden="true">{categoryIcon(card.category)}</span>
            {RARITY_LABELS[card.rarity]} ・ 旬: {monthsLabel(card.seasonMonths)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
        >
          {expanded ? "閉じる" : "編集"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          削除
        </button>
      </div>

      {expanded ? (
        <form action={handleSubmit} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">読み(ひらがな)</label>
            <input
              type="text"
              name="reading"
              defaultValue={card.reading ?? ""}
              placeholder={`例: ${card.name}`}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">旬の月(カンマ区切り。無ければ空欄)</label>
            <input
              type="text"
              name="season_months"
              defaultValue={(card.seasonMonths ?? []).join(",")}
              placeholder="例: 6,7,8"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">レアリティ</label>
            <select
              name="rarity"
              defaultValue={card.rarity}
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
            <label className="block text-xs font-medium text-gray-700">
              画像ファイル名(<code>public/cards/</code>配下。未設定可)
            </label>
            <input
              type="text"
              name="illustration_url"
              defaultValue={card.illustrationUrl ?? ""}
              placeholder="例: tomato.png"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              豆知識(こども向け)。漢字にふりがなを振る場合は「漢字{"{かんじ}"}」の形式で入力
            </label>
            <textarea
              name="trivia_kids_text"
              defaultValue={card.triviaKidsText ?? ""}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">豆知識(おとな向け・詳細)</label>
            <textarea
              name="trivia_adult_text"
              defaultValue={card.triviaAdultText ?? ""}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">栄養素メモ</label>
            <textarea
              name="nutrition_summary"
              defaultValue={card.nutritionSummary ?? ""}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
          >
            {isPending ? "保存中..." : "保存"}
          </button>
        </form>
      ) : null}
    </li>
  );
}
