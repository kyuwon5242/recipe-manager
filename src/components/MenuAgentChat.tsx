"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerRecipeIdea } from "@/app/recipes/actions";
import {
  createShoppingList,
  getMyShoppingListsForOverwrite,
  type ShoppingListSummary,
} from "@/app/shopping-list/actions";
import { SHOPPING_LIST_LIMIT_MESSAGE } from "@/lib/shopping/messages";
import {
  PLAN_SLOTS,
  type MenuAgentChatMessage,
  type MenuAgentEvent,
  type PlanItem,
  type ShoppingDraftItem,
} from "@/lib/anthropic/menu-agent-tools";
import { formatDateTime } from "@/lib/format-date";
import type { FamilyStore } from "@/types/shopping-settings";

const STORAGE_KEY = "recipe-app.menu-agent.v1";
const MAX_STORED_TURNS = 40; // ユーザー・エージェント合わせて約20往復ぶん

type TurnEvent =
  | { kind: "action"; label: string }
  | { kind: "message"; text: string }
  | { kind: "plan"; items: PlanItem[] }
  | { kind: "shopping_draft"; items: ShoppingDraftItem[] }
  | { kind: "out_of_scope"; text: string };

type ChatTurn = { role: "user"; text: string } | { role: "agent"; events: TurnEvent[] };

type StoredState = {
  turns: ChatTurn[];
  plan: PlanItem[];
  shoppingDraft: ShoppingDraftItem[] | null;
};

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function loadInitialState(): StoredState {
  if (typeof window === "undefined") return { turns: [], plan: [], shoppingDraft: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { turns: [], plan: [], shoppingDraft: null };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      turns: Array.isArray(parsed.turns) ? parsed.turns : [],
      plan: Array.isArray(parsed.plan) ? parsed.plan : [],
      shoppingDraft: Array.isArray(parsed.shoppingDraft) ? parsed.shoppingDraft : null,
    };
  } catch {
    return { turns: [], plan: [], shoppingDraft: null };
  }
}

function groupTurnEvents(
  events: TurnEvent[]
): ({ kind: "actions"; items: string[] } | Exclude<TurnEvent, { kind: "action" }>)[] {
  const groups: ({ kind: "actions"; items: string[] } | Exclude<TurnEvent, { kind: "action" }>)[] = [];
  for (const event of events) {
    if (event.kind === "action") {
      const last = groups[groups.length - 1];
      if (last && last.kind === "actions") last.items.push(event.label);
      else groups.push({ kind: "actions", items: [event.label] });
    } else {
      groups.push(event);
    }
  }
  return groups;
}

function groupByCategory(items: ShoppingDraftItem[]): [string, ShoppingDraftItem[]][] {
  const map = new Map<string, ShoppingDraftItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return Array.from(map.entries());
}

function sortPlanBySlot(items: PlanItem[]): PlanItem[] {
  return [...items].sort((a, b) => PLAN_SLOTS.indexOf(a.slot) - PLAN_SLOTS.indexOf(b.slot));
}

export function MenuAgentChat({ stores = [] }: { stores?: FamilyStore[] }) {
  const router = useRouter();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [latestShoppingDraft, setLatestShoppingDraft] = useState<ShoppingDraftItem[] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, startConfirm] = useTransition();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [overwriteCandidates, setOverwriteCandidates] = useState<ShoppingListSummary[] | null>(null);
  const [isLoadingOverwrite, startLoadOverwrite] = useTransition();
  const [selectedOverwriteId, setSelectedOverwriteId] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial = loadInitialState();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTurns(initial.turns);
    setPlan(initial.plan);
    setLatestShoppingDraft(initial.shoppingDraft);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ turns, plan, shoppingDraft: latestShoppingDraft })
      );
    } catch {
      // localStorageが使えない環境では諦める(プライベートウィンドウ等)
    }
  }, [turns, plan, latestShoppingDraft, hydrated]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const hasPendingIdeas = plan.some((item) => item.source === "idea");

  function buildApiMessages(sourceTurns: ChatTurn[]): MenuAgentChatMessage[] {
    const flat: MenuAgentChatMessage[] = [];
    for (const turn of sourceTurns) {
      if (turn.role === "user") {
        flat.push({ role: "user", text: turn.text });
      } else {
        const text = turn.events
          .filter((e): e is Extract<TurnEvent, { kind: "message" }> => e.kind === "message")
          .map((e) => e.text)
          .join("\n");
        if (text) flat.push({ role: "assistant", text });
      }
    }
    return flat;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    setError(null);
    setInput("");

    const userTurn: ChatTurn = { role: "user", text };
    let nextTurns = [...turns, userTurn];
    if (nextTurns.length > MAX_STORED_TURNS) {
      nextTurns = nextTurns.slice(nextTurns.length - MAX_STORED_TURNS);
    }
    const apiMessages = buildApiMessages(nextTurns);
    setTurns([...nextTurns, { role: "agent", events: [] }]);
    setIsSending(true);

    const agentEvents: TurnEvent[] = [];

    try {
      const res = await fetch("/api/menu-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, mealPlan: plan }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `エージェントの呼び出しに失敗しました(${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as MenuAgentEvent;

          if (event.type === "done") continue;
          if (event.type === "error") throw new Error(event.message);

          if (event.type === "action") {
            agentEvents.push({ kind: "action", label: event.label });
          } else if (event.type === "message") {
            agentEvents.push({ kind: "message", text: event.text });
          } else if (event.type === "plan") {
            agentEvents.push({ kind: "plan", items: event.items });
            setPlan(event.items);
          } else if (event.type === "shopping_draft") {
            agentEvents.push({ kind: "shopping_draft", items: event.items });
            setLatestShoppingDraft(event.items);
          } else if (event.type === "out_of_scope") {
            agentEvents.push({ kind: "out_of_scope", text: event.text });
          }

          setTurns((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "agent", events: [...agentEvents] };
            return next;
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "エージェントの呼び出しに失敗しました";
      setError(message);
    } finally {
      setIsSending(false);
      // AI利用上限のゲージ(サーバーコンポーネント)を最新化する。
      router.refresh();
    }
  }

  async function registerPendingIdeas(currentPlan: PlanItem[]): Promise<PlanItem[]> {
    const updated: PlanItem[] = [];
    for (const item of currentPlan) {
      if (item.source === "idea" && item.idea) {
        const recipeId = await registerRecipeIdea(item.idea);
        updated.push({ ...item, source: "existing", recipeId, idea: undefined });
      } else {
        updated.push(item);
      }
    }
    return updated;
  }

  function handleRegisterIdeas() {
    setError(null);
    startConfirm(async () => {
      try {
        const updated = await registerPendingIdeas(plan);
        setPlan(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "レシピの登録に失敗しました");
      }
    });
  }

  function handleConfirmShoppingList() {
    if (!latestShoppingDraft || latestShoppingDraft.length === 0) return;
    setError(null);
    setOverwriteCandidates(null);
    startConfirm(async () => {
      try {
        let currentPlan = plan;
        if (currentPlan.some((item) => item.source === "idea")) {
          currentPlan = await registerPendingIdeas(currentPlan);
          setPlan(currentPlan);
        }
        await createShoppingList(
          latestShoppingDraft.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
          })),
          { storeId: selectedStoreId || null }
        );
      } catch (err) {
        if (isRedirectError(err)) throw err;
        if (err instanceof Error && err.message === SHOPPING_LIST_LIMIT_MESSAGE) {
          startLoadOverwrite(async () => {
            try {
              const lists = await getMyShoppingListsForOverwrite();
              setOverwriteCandidates(lists);
            } catch (loadErr) {
              setError(loadErr instanceof Error ? loadErr.message : "取得に失敗しました");
            }
          });
          return;
        }
        setError(err instanceof Error ? err.message : "買い物リストの確定に失敗しました");
      }
    });
  }

  function handleOverwriteConfirm() {
    if (!latestShoppingDraft || !selectedOverwriteId) return;
    setError(null);
    startConfirm(async () => {
      try {
        await createShoppingList(
          latestShoppingDraft.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
          })),
          { storeId: selectedStoreId || null, overwriteListId: selectedOverwriteId }
        );
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "買い物リストの確定に失敗しました");
      }
    });
  }

  function handleReset() {
    setTurns([]);
    setPlan([]);
    setLatestShoppingDraft(null);
    setError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-4 text-xs leading-relaxed text-gray-500 shadow-raised">
        <p>
          <span className="font-semibold text-gray-700">行動ログについて: </span>
          エージェントが実際に呼んだ検索・集計処理の結果を短い行で表示します。
        </p>
        <p className="mt-1">
          <span className="font-semibold text-gray-700">確認が必要な操作: </span>
          新しいレシピの<span className="font-semibold">登録</span>と、買い物リストの
          <span className="font-semibold">確定</span>だけは、ボタンを押すまで実行されません。
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {turns.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-400 shadow-raised">
            例:「今週は和食中心で、4人分の献立を考えて。買い物リストまで作って。」
          </p>
        ) : null}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white shadow-brand">
                {turn.text}
              </div>
            </div>
          ) : (
            <AgentTurnView key={i} events={turn.events} />
          )
        )}
        <div ref={threadEndRef} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {overwriteCandidates || isLoadingOverwrite ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-800">
            買い物リストは1人3件までです。上書きするリストを選んでください。
          </p>
          {isLoadingOverwrite || !overwriteCandidates ? (
            <p className="mt-2 text-gray-500">読み込み中...</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {overwriteCandidates.map((list) => (
                <li key={list.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="menu-agent-overwrite-target"
                      checked={selectedOverwriteId === list.id}
                      onChange={() => setSelectedOverwriteId(list.id)}
                    />
                    <span>
                      {list.title}({list.itemCount}品目・{formatDateTime(list.created_at)}作成)
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleOverwriteConfirm}
              disabled={!selectedOverwriteId || isConfirming}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {isConfirming ? "保存中..." : "選んだリストを上書きする"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOverwriteCandidates(null);
                setSelectedOverwriteId("");
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {hasPendingIdeas || (latestShoppingDraft && latestShoppingDraft.length > 0) ? (
        <div className="flex flex-wrap items-center gap-2">
          {hasPendingIdeas ? (
            <button
              type="button"
              onClick={handleRegisterIdeas}
              disabled={isConfirming}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-brand transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {isConfirming ? "登録中..." : "登録して進める"}
            </button>
          ) : null}
          {latestShoppingDraft && latestShoppingDraft.length > 0 ? (
            <>
              {stores.length > 0 ? (
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  title="選ぶとそのスーパーの並び順で買い物リストを作成します"
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">スーパー指定なし</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={handleConfirmShoppingList}
                disabled={isConfirming}
                className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-raised transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {isConfirming ? "確定中..." : "この内容で買い物リストを確定する"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-raised"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="エージェントに話しかける…"
          disabled={isSending}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          title="送信"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        >
          {isSending ? "…" : "↑"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleReset}
        title="会話とプランをリセットして最初からやり直す"
        className="self-start text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
      >
        新しい会話を始める
      </button>
    </div>
  );
}

function AgentTurnView({ events }: { events: TurnEvent[] }) {
  const groups = groupTurnEvents(events);

  return (
    <div className="flex max-w-[92%] flex-col items-start gap-2">
      {groups.map((group, i) => {
        if (group.kind === "actions") {
          return (
            <div
              key={i}
              className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500"
            >
              {group.items.map((label, j) => (
                <div key={j} className="flex items-start gap-1.5">
                  <span className="text-green-700">✓</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          );
        }
        if (group.kind === "message") {
          return (
            <div
              key={i}
              className="rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-raised"
            >
              {group.text}
            </div>
          );
        }
        if (group.kind === "out_of_scope") {
          return (
            <div
              key={i}
              className="rounded-2xl rounded-bl-sm bg-violet-50 px-4 py-2.5 text-sm leading-relaxed text-violet-800 shadow-raised"
            >
              {group.text}
            </div>
          );
        }
        if (group.kind === "plan") {
          return (
            <div key={i} className="grid w-full grid-cols-2 gap-2">
              {sortPlanBySlot(group.items).map((item) => (
                <div key={item.id} className="rounded-xl bg-white p-2.5 shadow-raised">
                  <p className="text-[10px] font-bold text-gray-400">{item.slot}</p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-gray-800">{item.title}</p>
                  {item.source === "idea" ? (
                    <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">
                      新しい案・未登録
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          );
        }
        if (group.kind === "shopping_draft") {
          return (
            <div key={i} className="w-full rounded-xl bg-white p-3 shadow-raised">
              {groupByCategory(group.items).map(([category, items]) => (
                <div key={category} className="mt-2 first:mt-0">
                  <p className="text-[10px] font-bold text-green-700">{category}</p>
                  {items.map((item, k) => (
                    <div key={k} className="flex justify-between py-0.5 text-xs text-gray-700">
                      <span>{item.name}</span>
                      <span className="text-gray-400">
                        {[item.quantity, item.unit].filter((v) => v != null).join("")}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
