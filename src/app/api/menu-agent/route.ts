import { randomUUID } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAnthropicClient } from "@/lib/anthropic/client";
import { requireMenuAgentAccess } from "@/lib/admin/current";
import { getCurrentFamilyId } from "@/lib/family/current";
import { createClient } from "@/lib/supabase/server";
import { bucketGenre } from "@/lib/recipe-genre";
import {
  aggregateNeededIngredients,
  flattenToShoppingItems,
  type AggregateRecipeInput,
} from "@/lib/ingredients/aggregate";
import { sortByCategoryOrder } from "@/lib/ingredients/categories";
import { getFamilyDefaultItemsAsIngredients } from "@/lib/shopping/defaults";
import { logAiUsage, startTimer } from "@/lib/ai-usage/log";
import { getAiModelSettings } from "@/lib/ai-usage/model-settings";
import { getAiQuotaStatus, consumeAiQuota } from "@/lib/ai-usage/quota";
import { estimateCostUsd } from "@/lib/ai-usage/pricing";
import { logEvent } from "@/lib/logging/log";
import type { NewRecipeIdea } from "@/types/recipe-suggestion";
import {
  MENU_AGENT_TOOLS,
  GateResultSchema,
  SearchRecipesInputSchema,
  GetRecipeDetailsInputSchema,
  ProposeNewRecipeInputSchema,
  AddToMealPlanInputSchema,
  CreateShoppingListInputSchema,
  type PlanItem,
  type MenuAgentRequestBody,
  type MenuAgentEvent,
  type ShoppingDraftItem,
  type MenuAgentChatMessage,
} from "@/lib/anthropic/menu-agent-tools";

// 複数ラウンドのツール呼び出しループで数十秒かかることがあるため、
// Vercel上でもタイムアウトしないよう上限を延長する(Hobbyプランの実際の
// 上限である60秒を指定。/ingredientsの300秒指定はHobbyでは60秒に
// クランプされるため、実態に合わせてここでは60を明示する)。
export const maxDuration = 60;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_TOOL_ROUNDS = 8;
const GATE_HISTORY_TURNS = 6;

function todayInJapanese(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export async function POST(req: Request) {
  let admin: Awaited<ReturnType<typeof requireMenuAgentAccess>>;
  try {
    admin = await requireMenuAgentAccess();
  } catch (err) {
    const message = err instanceof Error ? err.message : "権限確認に失敗しました";
    return new Response(JSON.stringify({ error: message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: MenuAgentRequestBody;
  try {
    body = (await req.json()) as MenuAgentRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "リクエストの形式が不正です" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const mealPlan = Array.isArray(body.mealPlan) ? body.mealPlan : [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "メッセージがありません" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = admin.supabase;

  const quota = await getAiQuotaStatus(supabase);
  if (quota.remainingUsd <= 0) {
    return new Response(
      JSON.stringify({ error: "今週のAI利用上限に達しました。管理者にご連絡いただくか、リセットまでお待ちください。" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const familyId = await getCurrentFamilyId();
  const client = createAnthropicClient();
  const { menuAgentModel } = await getAiModelSettings(supabase);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: MenuAgentEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const gate = await runGateCheck(client, messages, supabase, familyId, admin.userId);
        if (!gate.in_scope) {
          send({
            type: "out_of_scope",
            text:
              gate.redirect_message ??
              "献立を決めることや、食材の確認・買い物リストの作成に関するご相談でしたらお手伝いできます。",
          });
          send({ type: "done" });
          controller.close();
          return;
        }

        await runAgentLoop({
          client,
          model: menuAgentModel,
          supabase,
          familyId,
          userId: admin.userId,
          messages,
          mealPlan,
          send,
        });
        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
        send({ type: "error", message });
        await logEvent(supabase, {
          level: "error",
          event: "menu_agent_failed",
          message,
          path: "/api/menu-agent",
          userId: admin.userId,
          familyId,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

async function runGateCheck(
  client: Anthropic,
  messages: MenuAgentChatMessage[],
  supabase: SupabaseServerClient,
  familyId: string,
  userId: string
): Promise<{ in_scope: boolean; redirect_message: string | null }> {
  const recent = messages.slice(-GATE_HISTORY_TURNS);
  try {
    const stopTimer = startTimer();
    const response = await client.messages.parse({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        "あなたは「献立エージェント」への入力を判定するゲートです。このエージェントの対象範囲は、家庭の献立を決めること・必要な食材を確認すること・買い物リストを作成することに関する会話です(レシピの相談や、直前の献立プランに関する調整・軽い雑談も対象に含みます)。\n\n直近の会話履歴と最新のユーザー発言を見て、対象範囲かどうかを判定してください。対象範囲外(料理・献立と全く関係のない話題)の場合は、やんわりと本来の用途に話を戻す案内メッセージをredirect_messageに日本語で書いてください。対象範囲内の場合はredirect_messageをnullにしてください。",
      messages: [
        {
          role: "user",
          content: `【直近の会話】\n${JSON.stringify(recent)}`,
        },
      ],
      // claude-haiku-4-5はeffortパラメータ非対応のためformatのみ指定する
      output_config: { format: zodOutputFormat(GateResultSchema) },
    });
    await logAiUsage(supabase, {
      familyId,
      userId,
      feature: "menu_agent_gate",
      model: "claude-haiku-4-5-20251001",
      usage: response.usage,
      durationMs: stopTimer(),
    });
    await consumeAiQuota(
      supabase,
      estimateCostUsd("claude-haiku-4-5-20251001", response.usage.input_tokens, response.usage.output_tokens)
    );
    revalidatePath("/menu-agent");
    const parsed = response.parsed_output;
    if (!parsed) return { in_scope: true, redirect_message: null };
    return parsed;
  } catch {
    // 判定自体に失敗した場合は安全側(対象内)に倒し、本番ループに委ねる
    return { in_scope: true, redirect_message: null };
  }
}

function buildSystemPrompt(workingPlan: PlanItem[]): string {
  const planSummary = workingPlan.map((item) => ({
    slot: item.slot,
    title: item.title,
    servings: item.servings,
    registered: item.source === "existing",
  }));

  return `あなたは家庭料理アプリ「レシピマネージャー」の献立エージェントです。本日は${todayInJapanese()}です。

ユーザー(このアプリの管理者)と会話しながら、次の流れを完成させることを目指してください:
①献立を決める(主食・主菜・副菜・汁物などの品目ごとにレシピを決める) → ②必要な食材を確認する → ③買い物リストを作成する。

会話の中で自然に、次に何をすればゴールに近づくかを提案し、上記の流れに誘導してください。ただし押し付けがましくならないように、ユーザーの要望を優先してください。一度にすべてを聞かず、人数・ジャンル・条件などを会話しながら確認してください。

【ツールの使い方】
- search_recipes / get_recipe_details: 登録済みレシピを検索・参照する。献立の候補はまずここから探すこと。
- propose_new_recipe: 登録済みレシピに適切な候補が無い場合のみ、新しいレシピ案を考えて提示する。呼んだだけでは登録されない。
- add_to_meal_plan: 見つけた/考えたレシピを献立プランに追加する。propose_new_recipeで作った未登録の案も、確認を待たずすぐに追加してよい(画面には「未登録」と表示されるので、ユーザーはプラン全体を見ながら判断できる)。
- compute_shopping_list: 現在の献立から必要な食材を集計する(途中経過の確認用。何度呼んでもよい)。
- create_shopping_list: 買い物リストの下書きを最終確認用にユーザーへ提示する。データベースへの保存はユーザーがボタンを押すまで行われないので、安心して呼び出してよい。

【確認が必要な操作(必ずユーザーに一言確認すること)】
- propose_new_recipeで作った新しい案は、実際にレシピとして登録される前にユーザーの意思確認が必要です。「登録して進めますか?」のように尋ねてください(実際の登録操作は画面のボタンで行われます)。
- create_shopping_listで提示した買い物リストも、画面のボタンをユーザーが押すまでは保存されません。

【回答スタイル】
- 日本語で、簡潔に。
- 表示はチャットのプレーンテキストです。Markdown記法(**太字**や見出し、箇条書きの「-」など)は使わず、自然な文章・改行だけで書いてください。
- 料理・献立・買い物リストと関係のない話題が来た場合は、この機能の目的に軽く話を戻してください。

【現在の献立プラン】
${workingPlan.length > 0 ? JSON.stringify(planSummary) : "(まだ何も決まっていません)"}`;
}

async function runAgentLoop(params: {
  client: Anthropic;
  model: string;
  supabase: SupabaseServerClient;
  familyId: string;
  userId: string;
  messages: MenuAgentChatMessage[];
  mealPlan: PlanItem[];
  send: (event: MenuAgentEvent) => void;
}) {
  const { client, model, supabase, familyId, userId, messages, mealPlan, send } = params;

  const workingPlan: PlanItem[] = mealPlan.map((item) => ({ ...item }));
  const ideaMap = new Map<string, NewRecipeIdea>();
  let ideaCounter = 0;

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stopTimer = startTimer();
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: buildSystemPrompt(workingPlan),
      messages: anthropicMessages,
      tools: MENU_AGENT_TOOLS,
    });
    const roundDurationMs = stopTimer();

    await logAiUsage(supabase, {
      familyId,
      userId,
      feature: "menu_agent_loop",
      model,
      usage: response.usage,
      durationMs: roundDurationMs,
    });
    await consumeAiQuota(
      supabase,
      estimateCostUsd(model, response.usage.input_tokens, response.usage.output_tokens)
    );
    revalidatePath("/menu-agent");

    const textParts: string[] = [];
    const toolUses: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text") textParts.push(block.text);
      else if (block.type === "tool_use") toolUses.push(block);
    }

    if (toolUses.length === 0 || response.stop_reason !== "tool_use") {
      const text = textParts.join("\n").trim();
      if (text) send({ type: "message", text });
      break;
    }

    anthropicMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let shoppingDraft: ShoppingDraftItem[] | null = null;

    for (const toolUse of toolUses) {
      try {
        const { label, resultText, shoppingDraft: draft } = await executeTool({
          toolUse,
          supabase,
          familyId,
          workingPlan,
          ideaMap,
          nextIdeaId: () => `idea_${++ideaCounter}`,
        });
        send({ type: "action", label });
        if (draft) shoppingDraft = draft;
        toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: resultText });
      } catch (err) {
        const message = err instanceof Error ? err.message : "ツールの実行に失敗しました";
        send({ type: "action", label: `エラー: ${message}` });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: message }),
          is_error: true,
        });
      }
    }

    const text = textParts.join("\n").trim();
    if (text) send({ type: "message", text });

    send({ type: "plan", items: workingPlan });
    if (shoppingDraft) send({ type: "shopping_draft", items: shoppingDraft });

    anthropicMessages.push({ role: "user", content: toolResults });
  }
}

type SearchRow = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  recipe_ingredients: { ingredients_master: { name: string } | null }[];
};

type IngredientRow = {
  quantity: number | null;
  unit: string | null;
  ingredients_master: { name: string; category: string | null } | null;
};

type RecipeWithIngredientsRow = {
  id: string;
  servings: number | null;
  recipe_ingredients: IngredientRow[];
};

async function executeTool(params: {
  toolUse: Anthropic.ToolUseBlock;
  supabase: SupabaseServerClient;
  familyId: string;
  workingPlan: PlanItem[];
  ideaMap: Map<string, NewRecipeIdea>;
  nextIdeaId: () => string;
}): Promise<{ label: string; resultText: string; shoppingDraft?: ShoppingDraftItem[] }> {
  const { toolUse, supabase, familyId, workingPlan, ideaMap, nextIdeaId } = params;

  switch (toolUse.name) {
    case "search_recipes": {
      const input = SearchRecipesInputSchema.parse(toolUse.input);
      const query = supabase
        .from("recipes")
        .select("id, title, category, genre, servings, recipe_ingredients(ingredients_master(name))")
        .eq("family_id", familyId);
      const { data, error } = input.category
        ? await query.eq("category", input.category).returns<SearchRow[]>()
        : await query.returns<SearchRow[]>();
      if (error) throw new Error(`レシピの検索に失敗しました: ${error.message}`);

      let rows = data ?? [];
      if (input.genre) {
        rows = rows.filter((r) => bucketGenre(r.genre) === input.genre);
      }
      if (input.query) {
        const q = input.query.toLowerCase();
        rows = rows.filter((r) => {
          const titleMatch = r.title.toLowerCase().includes(q);
          const ingredientMatch = r.recipe_ingredients.some((ri) =>
            ri.ingredients_master?.name.toLowerCase().includes(q)
          );
          return titleMatch || ingredientMatch;
        });
      }

      const results = rows.slice(0, 20).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        genre: r.genre,
        servings: r.servings,
      }));

      const labelParts = [input.query, input.genre, input.category].filter(Boolean);
      return {
        label: `レシピを検索中${labelParts.length ? `: ${labelParts.join("・")}` : ""} → ${results.length}件見つかりました`,
        resultText: JSON.stringify({ recipes: results }),
      };
    }

    case "get_recipe_details": {
      const input = GetRecipeDetailsInputSchema.parse(toolUse.input);
      const { data: recipe, error } = await supabase
        .from("recipes")
        .select("id, title, category, genre, servings, instructions")
        .eq("id", input.recipe_id)
        .eq("family_id", familyId)
        .maybeSingle();
      if (error) throw new Error(`レシピの取得に失敗しました: ${error.message}`);
      if (!recipe) {
        return {
          label: "レシピ詳細を取得 → 見つかりませんでした",
          resultText: JSON.stringify({ error: "レシピが見つかりません" }),
        };
      }

      const { data: ingredientRows, error: ingError } = await supabase
        .from("recipe_ingredients")
        .select("quantity, unit, ingredients_master(name, category)")
        .eq("recipe_id", input.recipe_id)
        .returns<IngredientRow[]>();
      if (ingError) throw new Error(`材料の取得に失敗しました: ${ingError.message}`);

      const ingredients = (ingredientRows ?? [])
        .filter((r) => r.ingredients_master)
        .map((r) => ({
          name: r.ingredients_master!.name,
          quantity: r.quantity,
          unit: r.unit,
          category: r.ingredients_master!.category,
        }));

      return {
        label: `「${recipe.title}」の詳細を確認`,
        resultText: JSON.stringify({ ...recipe, ingredients }),
      };
    }

    case "propose_new_recipe": {
      const input = ProposeNewRecipeInputSchema.parse(toolUse.input);
      const ideaId = nextIdeaId();
      const idea: NewRecipeIdea = {
        title: input.title,
        reason: input.reason ?? "",
        recipe: {
          title: input.title,
          category: input.category ?? null,
          genre: input.genre ?? null,
          servings: input.servings ?? null,
          instructions: input.instructions ?? null,
          memo: null,
          recipe_url: null,
        },
        ingredients: input.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity != null ? String(ing.quantity) : "",
          unit: ing.unit ?? "",
        })),
      };
      ideaMap.set(ideaId, idea);
      return {
        label: `新しいレシピ案を作成: 「${input.title}」`,
        resultText: JSON.stringify({ idea_id: ideaId, idea }),
      };
    }

    case "add_to_meal_plan": {
      const input = AddToMealPlanInputSchema.parse(toolUse.input);
      let title: string;
      let planItem: PlanItem;

      if (input.source === "existing") {
        if (!input.recipe_id) throw new Error("recipe_idが指定されていません");
        const { data: recipe, error } = await supabase
          .from("recipes")
          .select("id, title")
          .eq("id", input.recipe_id)
          .eq("family_id", familyId)
          .maybeSingle();
        if (error) throw new Error(`レシピの取得に失敗しました: ${error.message}`);
        if (!recipe) throw new Error("指定されたレシピが見つかりません");
        title = recipe.title;
        planItem = {
          id: randomUUID(),
          slot: input.slot,
          servings: input.servings,
          source: "existing",
          title,
          recipeId: recipe.id,
        };
      } else {
        if (!input.idea_ref) throw new Error("idea_refが指定されていません");
        const idea = ideaMap.get(input.idea_ref);
        if (!idea) throw new Error("指定された案が見つかりません(先にpropose_new_recipeを呼んでください)");
        title = idea.title;
        planItem = {
          id: randomUUID(),
          slot: input.slot,
          servings: input.servings,
          source: "idea",
          title,
          idea,
        };
      }

      // 同じ品目に既に何か入っている場合は置き換える(1品目1レシピを想定)
      const existingIndex = workingPlan.findIndex((p) => p.slot === input.slot);
      if (existingIndex >= 0) workingPlan.splice(existingIndex, 1, planItem);
      else workingPlan.push(planItem);

      return {
        label: `献立プランに追加: ${input.slot}「${title}」`,
        resultText: JSON.stringify({ ok: true, plan_item_id: planItem.id }),
      };
    }

    case "compute_shopping_list": {
      const items = await computeShoppingItems(supabase, familyId, workingPlan);
      return {
        label: `必要な食材を集計中 → ${items.length}品目`,
        resultText: JSON.stringify({ items }),
      };
    }

    case "create_shopping_list": {
      const input = CreateShoppingListInputSchema.parse(toolUse.input);
      let items = await computeShoppingItems(supabase, familyId, workingPlan);
      if (input.exclude_names && input.exclude_names.length > 0) {
        // 食材名には「A 塩」のように手順グループの接頭辞が付くことがあるため、
        // 完全一致ではなく部分一致で除外する
        const excludeNames = input.exclude_names.map((n) => n.trim()).filter(Boolean);
        items = items.filter((item) => !excludeNames.some((name) => item.name.includes(name)));
      }
      const excludeLabel = input.exclude_names?.length ? `(${input.exclude_names.join("・")}を除外)` : "";
      return {
        label: `買い物リストの下書きを作成 → ${items.length}品目${excludeLabel}`,
        resultText: JSON.stringify({
          items,
          note: "この下書きはまだ保存されていません。ユーザーが画面のボタンで確定するまで待ってください。",
        }),
        shoppingDraft: items,
      };
    }

    default:
      return {
        label: `不明なツール: ${toolUse.name}`,
        resultText: JSON.stringify({ error: "不明なツールです" }),
      };
  }
}

async function computeShoppingItems(
  supabase: SupabaseServerClient,
  familyId: string,
  workingPlan: PlanItem[]
): Promise<ShoppingDraftItem[]> {
  const existingIds = Array.from(
    new Set(
      workingPlan
        .filter((p) => p.source === "existing" && p.recipeId)
        .map((p) => p.recipeId!)
    )
  );

  const recipeById = new Map<
    string,
    { servings: number | null; ingredients: { name: string; quantity: number | null; unit: string | null; category: string | null }[] }
  >();

  if (existingIds.length > 0) {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, servings, recipe_ingredients(quantity, unit, ingredients_master(name, category))")
      .in("id", existingIds)
      .eq("family_id", familyId)
      .returns<RecipeWithIngredientsRow[]>();
    if (error) throw new Error(`レシピの取得に失敗しました: ${error.message}`);
    for (const r of data ?? []) {
      recipeById.set(r.id, {
        servings: r.servings,
        ingredients: r.recipe_ingredients
          .filter((ri) => ri.ingredients_master)
          .map((ri) => ({
            name: ri.ingredients_master!.name,
            quantity: ri.quantity,
            unit: ri.unit,
            category: ri.ingredients_master!.category,
          })),
      });
    }
  }

  // 未登録の新規案の食材にも、既存マスタに同名があればカテゴリを当てはめる
  const ideaNames = Array.from(
    new Set(
      workingPlan
        .filter((p) => p.source === "idea" && p.idea)
        .flatMap((p) => p.idea!.ingredients.map((i) => i.name.trim()))
        .filter(Boolean)
    )
  );
  const categoryByName = new Map<string, string | null>();
  if (ideaNames.length > 0) {
    const { data, error } = await supabase
      .from("ingredients_master")
      .select("name, category")
      .in("name", ideaNames);
    if (error) throw new Error(`食材マスタの取得に失敗しました: ${error.message}`);
    for (const row of data ?? []) categoryByName.set(row.name, row.category);
  }

  const recipeInputs: AggregateRecipeInput[] = workingPlan.map((item) => {
    if (item.source === "existing" && item.recipeId) {
      const recipe = recipeById.get(item.recipeId);
      return {
        servings: recipe?.servings ?? null,
        targetServings: item.servings,
        ingredients: recipe?.ingredients ?? [],
      };
    }
    const idea = item.idea!;
    return {
      servings: idea.recipe.servings,
      targetServings: item.servings,
      ingredients: idea.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity.trim() ? Number(ing.quantity) : null,
        unit: ing.unit || null,
        category: categoryByName.get(ing.name.trim()) ?? null,
      })),
    };
  });

  // 家族の「どの買い物でも必ず含める食材」も献立と同様に集計に加える
  const defaultItems = await getFamilyDefaultItemsAsIngredients(supabase, familyId);
  if (defaultItems.length > 0) {
    recipeInputs.push({ servings: null, ingredients: defaultItems });
  }

  const needed = aggregateNeededIngredients(recipeInputs);
  return sortByCategoryOrder(flattenToShoppingItems(needed));
}
