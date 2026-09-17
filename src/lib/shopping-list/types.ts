export type NeededIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type OwnedIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type ShortageItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  note?: string;
};

export type AgentTraceStep =
  | { type: "assistant_text"; text: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; output: unknown }
  | { type: "final_text"; text: string };
