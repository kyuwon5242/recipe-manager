import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { NewRecipeIdea } from "@/types/recipe-suggestion";

// 献立エージェントが献立プランに追加できる品目。GENRE_TABSの「その他」は
// 献立の構成要素として不自然なため対象外にしている。
export const PLAN_SLOTS = ["主食", "主菜", "副菜", "汁物"] as const;
export type PlanSlot = (typeof PLAN_SLOTS)[number];

export type PlanItem = {
  id: string;
  slot: PlanSlot;
  servings: number;
  source: "existing" | "idea";
  title: string;
  recipeId?: string; // source === "existing" のとき(登録済みレシピ案が登録された後もここに入る)
  idea?: NewRecipeIdea; // source === "idea" のとき(未登録の新規案)
};

export type ShoppingDraftItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

export type MenuAgentChatMessage = { role: "user" | "assistant"; text: string };

export type MenuAgentRequestBody = {
  messages: MenuAgentChatMessage[];
  mealPlan: PlanItem[];
};

export type MenuAgentEvent =
  | { type: "action"; label: string }
  | { type: "message"; text: string }
  | { type: "plan"; items: PlanItem[] }
  | { type: "shopping_draft"; items: ShoppingDraftItem[] }
  | { type: "out_of_scope"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

// --- ゲートチェック(Haiku)用の構造化出力スキーマ ---
export const GateResultSchema = z.object({
  in_scope: z.boolean(),
  redirect_message: z.string().nullable(),
});

// --- 各ツールの入力スキーマ(サーバー側の検証用) ---
export const SearchRecipesInputSchema = z.object({
  query: z.string().nullable().optional(),
  genre: z.enum(PLAN_SLOTS).nullable().optional(),
  category: z.string().nullable().optional(),
});

export const GetRecipeDetailsInputSchema = z.object({
  recipe_id: z.string(),
});

export const ProposeNewRecipeInputSchema = z.object({
  title: z.string(),
  reason: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  genre: z.enum(PLAN_SLOTS).nullable().optional(),
  servings: z.number().nullable().optional(),
  instructions: z.string().nullable().optional(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
    })
  ),
});

export const AddToMealPlanInputSchema = z.object({
  slot: z.enum(PLAN_SLOTS),
  source: z.enum(["existing", "idea"]),
  recipe_id: z.string().nullable().optional(),
  idea_ref: z.string().nullable().optional(),
  servings: z.number(),
});

export const ComputeShoppingListInputSchema = z.object({});

export const CreateShoppingListInputSchema = z.object({
  exclude_names: z.array(z.string()).nullable().optional(),
});

// --- Anthropic messages.create() の tools パラメータに渡す定義 ---
export const MENU_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_recipes",
    description:
      "家族に登録済みのレシピを検索する。料理名・食材名のキーワード、品目(主食/主菜/副菜/汁物)、カテゴリ(和食/洋食/中華など)で絞り込める。献立の候補はまずここから探すこと。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "料理名や食材名の一部(部分一致)。省略可" },
        genre: { type: "string", enum: [...PLAN_SLOTS], description: "品目。省略可" },
        category: { type: "string", description: "和食/洋食/中華など。省略可" },
      },
    },
  },
  {
    name: "get_recipe_details",
    description: "指定したレシピIDの詳細(材料・人数・手順)を取得する。",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: { type: "string" },
      },
      required: ["recipe_id"],
    },
  },
  {
    name: "propose_new_recipe",
    description:
      "登録済みレシピの中に適切な候補が無い場合に、新しいレシピ案を考えてユーザーに提示する。このツールを呼んだだけではデータベースには登録されない。ユーザーが確認して初めて登録される。",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        reason: { type: "string", description: "なぜこの案を提案するか、一言" },
        category: { type: "string", description: "和食/洋食/中華など" },
        genre: { type: "string", enum: [...PLAN_SLOTS] },
        servings: { type: "number" },
        instructions: { type: "string" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
            },
            required: ["name"],
          },
        },
      },
      required: ["title", "ingredients"],
    },
  },
  {
    name: "add_to_meal_plan",
    description:
      "検索で見つけた既存レシピ、またはpropose_new_recipeで作った案を、今組み立てている献立プランに追加する。実行すると即座にプランに反映される(確認不要)。",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", enum: [...PLAN_SLOTS], description: "献立の品目" },
        source: {
          type: "string",
          enum: ["existing", "idea"],
          description: "existing=search_recipes/get_recipe_detailsで見つけた登録済みレシピ、idea=propose_new_recipeで作った案",
        },
        recipe_id: { type: "string", description: "source=existingの場合の対象レシピID" },
        idea_ref: {
          type: "string",
          description:
            "source=ideaの場合、直前のpropose_new_recipeのtool_resultで返されたidea_id",
        },
        servings: { type: "number", description: "この品目の人数(分からなければユーザーに確認すること)" },
      },
      required: ["slot", "source", "servings"],
    },
  },
  {
    name: "compute_shopping_list",
    description:
      "現在の献立プラン(add_to_meal_planで追加した品目)から、必要な食材を集計する。単位のばらつきは自動的に統合され、スーパーの売り場カテゴリごとに整理される。途中経過の確認用に何度呼んでもよい。",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_shopping_list",
    description:
      "買い物リストの下書きを最終確認用にユーザーへ提示する。exclude_namesで「家にあるから除いて」と言われた食材を除外できる。このツール自体はデータベースへの保存を行わない。実際の保存はユーザーが画面のボタンを押したときのみ行われるため、安心して呼び出してよい。",
    input_schema: {
      type: "object",
      properties: {
        exclude_names: {
          type: "array",
          items: { type: "string" },
          description: "家にあるなどの理由でリストから除外する食材名(任意)",
        },
      },
    },
  },
];
