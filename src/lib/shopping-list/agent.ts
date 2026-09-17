import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/anthropic/client";
import type {
  NeededIngredient,
  OwnedIngredient,
  ShortageItem,
  AgentTraceStep,
} from "./types";

const MODEL = "claude-opus-5";
const COMPARE_TOOL_NAME = "compare_ingredients";
const MAX_ITERATIONS = 4;

function buildCompareTool(): Anthropic.Tool {
  return {
    name: COMPARE_TOOL_NAME,
    description:
      "手持ちの食材リストと、レシピに必要な食材リスト(サーバー側で保持)を照合し、不足している食材と数量を算出します。owned には、ユーザーの手持ち食材を名前・数量・単位に構造化して渡してください。数量や単位が読み取れない場合は null にしてください。",
    input_schema: {
      type: "object",
      properties: {
        owned: {
          type: "array",
          description: "ユーザーが手持ちと申告した食材のリスト",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "食材名" },
              quantity: {
                type: ["number", "null"],
                description: "数量(不明な場合はnull)",
              },
              unit: {
                type: ["string", "null"],
                description: "単位(個、g など。不明な場合はnull)",
              },
            },
            required: ["name", "quantity", "unit"],
          },
        },
      },
      required: ["owned"],
    },
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function compareIngredients(
  needed: NeededIngredient[],
  owned: OwnedIngredient[]
): { shortages: ShortageItem[]; sufficient: string[] } {
  const shortages: ShortageItem[] = [];
  const sufficient: string[] = [];

  for (const need of needed) {
    const matches = owned.filter(
      (o) => normalizeName(o.name) === normalizeName(need.name)
    );

    if (matches.length === 0) {
      shortages.push({ name: need.name, quantity: need.quantity, unit: need.unit });
      continue;
    }

    const hasUnspecifiedAmount = matches.some((m) => m.quantity == null);
    if (hasUnspecifiedAmount || need.quantity == null) {
      sufficient.push(need.name);
      continue;
    }

    const sameUnitMatches = matches.filter(
      (m) => (m.unit ?? "").trim() === (need.unit ?? "").trim()
    );

    if (sameUnitMatches.length === 0) {
      shortages.push({
        name: need.name,
        quantity: need.quantity,
        unit: need.unit,
        note: "手持ちの単位が異なるため要確認",
      });
      continue;
    }

    const ownedTotal = sameUnitMatches.reduce(
      (sum, m) => sum + (m.quantity ?? 0),
      0
    );
    const shortfall = need.quantity - ownedTotal;

    if (shortfall > 0) {
      shortages.push({ name: need.name, quantity: shortfall, unit: need.unit });
    } else {
      sufficient.push(need.name);
    }
  }

  return { shortages, sufficient };
}

const SYSTEM_PROMPT = `あなたは家庭の買い物リスト作成を支援するアシスタントです。次の手順で作業してください。

1. ユーザーが入力した「手持ちの食材」のテキストを読み、食材名・数量・単位に構造化してください。数量や単位が読み取れない場合は null にしてください。
2. 構造化した手持ち食材のリストを引数にして、必ず compare_ingredients ツールを1回呼び出してください。ツールがレシピに必要な食材との照合を行います。
3. ツールの結果に含まれる不足食材(shortages)だけを使って、買い物リストを作成してください。
4. 出力はMarkdown記法(#, *, \`など)を使わず、【カテゴリ名】を見出しとして食材を分類し(例: 【野菜】【肉・魚】【調味料】【その他】)、各カテゴリの下に「・食材名 数量単位」の形式で1行ずつ書いてください。数量が不明な食材は「・食材名」だけにしてください。
5. shortagesが空の場合は「不足している食材はありません。」とだけ伝えてください。
6. ツールの結果以外の食材を買い物リストに含めないでください。`;

export type ShoppingListResult = {
  finalText: string;
  trace: AgentTraceStep[];
};

export async function runShoppingListAgent(
  needed: NeededIngredient[],
  stockText: string
): Promise<ShoppingListResult> {
  const client = createAnthropicClient();
  const tool = buildCompareTool();
  const trace: AgentTraceStep[] = [];

  const userContent = `【必要な食材(選択したレシピから集計済み)】\n${JSON.stringify(
    needed
  )}\n\n【ユーザーが入力した手持ちの食材】\n${stockText.trim() || "(入力なし)"}`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userContent },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [tool],
      output_config: { effort: "medium" },
      messages,
    });

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    for (const block of textBlocks) {
      if (block.text.trim()) {
        trace.push({ type: "assistant_text", text: block.text });
      }
    }

    if (response.stop_reason === "refusal") {
      throw new Error("エージェントが安全上の理由で回答を拒否しました");
    }

    if (response.stop_reason !== "tool_use") {
      const finalText = textBlocks.map((b) => b.text).join("\n").trim();
      trace.push({ type: "final_text", text: finalText });
      return { finalText, trace };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      trace.push({
        type: "tool_call",
        toolName: toolUse.name,
        input: toolUse.input,
      });

      if (toolUse.name === COMPARE_TOOL_NAME) {
        const input = toolUse.input as { owned?: OwnedIngredient[] };
        const result = compareIngredients(needed, input.owned ?? []);
        trace.push({ type: "tool_result", output: result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: `未知のツールです: ${toolUse.name}`,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("エージェントの処理が完了しませんでした(反復回数の上限に到達)");
}
