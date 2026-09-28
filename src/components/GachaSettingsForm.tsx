"use client";

import { useActionState, useState } from "react";
import { updateGachaSettings, type UpdateGachaSettingsState } from "@/app/admin/game-gacha/actions";
import { CARD_RARITIES, RARITY_LABELS, type CardRarity } from "@/lib/game/cards";
import { effectiveRarityRates, type GachaSettings } from "@/lib/game/gacha-settings";

const initialState: UpdateGachaSettingsState = { error: null, success: false };

function toNumber(text: string): number {
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function GachaSettingsForm({
  settings,
  cardCounts,
}: {
  settings: GachaSettings;
  cardCounts: Record<CardRarity, number>;
}) {
  const [state, formAction, isPending] = useActionState(updateGachaSettings, initialState);
  const [weightTexts, setWeightTexts] = useState<Record<CardRarity, string>>(
    () => Object.fromEntries(CARD_RARITIES.map((r) => [r, String(settings.weights[r])])) as Record<CardRarity, string>
  );

  // 入力中の重みで、実際の出現率をその場で確認できるようにする
  const rates = effectiveRarityRates(
    Object.fromEntries(CARD_RARITIES.map((r) => [r, toNumber(weightTexts[r])])) as Record<CardRarity, number>,
    cardCounts
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">レアリティごとの重み</p>
        <p className="mt-0.5 text-xs text-gray-400">
          重みの比で出現率が決まります(合計が100である必要はありません)。カードが1枚も無いレアリティは抽選から外れ、残りで按分されます。
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1 font-normal">レアリティ</th>
              <th className="py-1 font-normal">重み</th>
              <th className="py-1 font-normal">カード枚数</th>
              <th className="py-1 text-right font-normal">実際の出現率</th>
            </tr>
          </thead>
          <tbody>
            {CARD_RARITIES.map((rarity) => (
              <tr key={rarity} className="border-t border-gray-100">
                <td className="py-2">{RARITY_LABELS[rarity]}</td>
                <td className="py-2">
                  <input
                    type="number"
                    name={`weight_${rarity}`}
                    min="0"
                    max="1000"
                    step="any"
                    value={weightTexts[rarity]}
                    onChange={(e) => setWeightTexts((prev) => ({ ...prev, [rarity]: e.target.value }))}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2 text-gray-500">{cardCounts[rarity]}枚</td>
                <td className="py-2 text-right font-medium">{(rates[rarity] * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium text-gray-700">旬の食材の倍率</label>
        <p className="mt-0.5 text-xs text-gray-400">
          当選したレアリティの中で、今月が旬の食材(旬の月が未設定のものは対象外)の出やすさを何倍にするかです。1で旬による優遇なしになります。
        </p>
        <div className="mt-2 flex items-center gap-1">
          <input
            type="number"
            name="season_multiplier"
            min="1"
            max="100"
            step="any"
            defaultValue={settings.seasonMultiplier}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          <span className="text-sm text-gray-400">倍</span>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          保存しました。次のガチャから反映されます。
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
