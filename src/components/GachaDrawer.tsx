"use client";

import Link from "next/link";
import { useActionState } from "react";
import { drawGacha, type GachaDrawState } from "@/app/game/gacha/actions";
import { GameCardVisual } from "@/components/GameCardVisual";
import { RARITY_LABELS, RARITY_BADGE_STYLES } from "@/lib/game/cards";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: GachaDrawState = { error: null, card: null, remainingDraws: null };

// ガチャを引くボタンと結果表示。回数の判定・抽選はすべてサーバー側(draw_gacha)で行う。
export function GachaDrawer({ remainingDraws }: { remainingDraws: number }) {
  const [state, formAction, isPending] = useActionState(drawGacha, initialState);
  const remaining = state.remainingDraws ?? remainingDraws;
  const card = state.card;

  return (
    <div>
      <div className="mt-6 rounded-xl bg-white p-6 text-center shadow-raised">
        {isPending ? (
          <div className="gacha-pack" aria-live="polite">
            <span aria-hidden="true" className="text-6xl">
              🎁
            </span>
            <p className="mt-2 text-sm text-gray-500">カードを引いています…</p>
          </div>
        ) : card ? (
          <div key={card.drawnAt} className="gacha-reveal mx-auto w-56 max-w-full">
            <GameCardVisual
              category={card.category}
              rarity={card.rarity}
              src={card.src}
              name={card.name}
              reading={card.reading}
              seasonMonths={card.seasonMonths}
              isOwned
              iconClassName="text-5xl"
            />
            <div className="mt-3 flex items-center justify-center gap-2">
              {card.isNew ? (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">NEW!</span>
              ) : (
                <span className="text-xs text-gray-500">{card.totalOwned}枚目(ダブり)</span>
              )}
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${RARITY_BADGE_STYLES[card.rarity].bg} ${RARITY_BADGE_STYLES[card.rarity].text}`}
              >
                {RARITY_LABELS[card.rarity]}
              </span>
            </div>
            <Link href={`/game/cards/${card.id}`} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
              カードの詳細を見る
            </Link>
          </div>
        ) : (
          <div>
            <span aria-hidden="true" className="text-6xl">
              🎁
            </span>
            <p className="mt-2 text-sm text-gray-500">
              {remaining > 0 ? "ボタンを押して、今日のカードを引きましょう" : "今日のガチャはおしまいです。また明日!"}
            </p>
          </div>
        )}

        {state.error ? <p className="mt-4 text-sm text-red-600">{state.error}</p> : null}

        {remaining > 0 ? (
          <form action={formAction} className="mt-5">
            <SubmitButton label={card ? "もう1回引く" : "ガチャを引く"} pendingLabel="引いています…" />
          </form>
        ) : card ? (
          <p className="mt-5 text-sm text-gray-500">今日のガチャはおしまいです。また明日!</p>
        ) : null}
      </div>
    </div>
  );
}
