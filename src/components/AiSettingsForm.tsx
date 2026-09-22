"use client";

import { useActionState } from "react";
import { updateAiModelSettings, type UpdateModelSettingsState } from "@/app/admin/ai-settings/actions";
import { AI_MODEL_OPTIONS, AI_MODEL_LABELS, type AiModelSettings } from "@/lib/ai-usage/model-settings";

const FIELDS: { key: keyof AiModelSettings; formKey: string; label: string; desc: string }[] = [
  {
    key: "menuPlanModel",
    formKey: "menu_plan_model",
    label: "献立提案",
    desc: "登録済みレシピの中から献立を組み立てる機能",
  },
  {
    key: "recipeSuggestionModel",
    formKey: "recipe_suggestion_model",
    label: "新レシピ提案",
    desc: "AIが新しいレシピ案を複数考案する機能",
  },
  {
    key: "menuAgentModel",
    formKey: "menu_agent_model",
    label: "献立エージェント(本体)",
    desc: "会話しながら献立を決めるツール呼び出しループ(門番判定は常にHaiku 4.5で固定)",
  },
];

const initialState: UpdateModelSettingsState = { error: null, success: false };

export function AiSettingsForm({ settings }: { settings: AiModelSettings }) {
  const [state, formAction, isPending] = useActionState(updateAiModelSettings, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      {FIELDS.map((field) => (
        <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4">
          <label className="block text-sm font-medium text-gray-700">{field.label}</label>
          <p className="mt-0.5 text-xs text-gray-400">{field.desc}</p>
          <select
            name={field.formKey}
            defaultValue={settings[field.key]}
            className="mt-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {AI_MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {AI_MODEL_LABELS[model]}
              </option>
            ))}
          </select>
        </div>
      ))}

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          保存しました。次回の呼び出しから反映されます。
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
