import type { createClient } from "@/lib/supabase/server";
import type { FamilyDefaultItem, FamilyStore } from "@/types/shopping-settings";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// 「どの買い物でも必ず含める食材」を、aggregateNeededIngredients にそのまま
// 渡せる疑似レシピの形にして返す(servings=nullなので倍率計算は適用されない)。
export async function getFamilyDefaultItemsAsIngredients(
  supabase: SupabaseServerClient,
  familyId: string
): Promise<{ name: string; quantity: number | null; unit: string | null; category: string | null }[]> {
  const { data, error } = await supabase
    .from("family_default_items")
    .select("name, quantity, unit, category")
    .eq("family_id", familyId)
    .order("position", { ascending: true })
    .returns<{ name: string; quantity: number | null; unit: string | null; category: string }[]>();

  if (error) {
    throw new Error(`デフォルト食材の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

export async function getFamilyStores(
  supabase: SupabaseServerClient,
  familyId: string
): Promise<FamilyStore[]> {
  const { data, error } = await supabase
    .from("family_stores")
    .select("id, name, category_order, position")
    .eq("family_id", familyId)
    .order("position", { ascending: true })
    .returns<FamilyStore[]>();

  if (error) {
    throw new Error(`スーパー設定の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

export type { FamilyDefaultItem, FamilyStore };
