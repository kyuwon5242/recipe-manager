"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyId } from "@/lib/family/current";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ParsedRecipeFields = {
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  instructions: string | null;
  memo: string | null;
  recipe_url: string | null;
};

function parseRecipeFields(formData: FormData): ParsedRecipeFields {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("レシピ名は必須です");
  }

  const servingsRaw = String(formData.get("servings") ?? "").trim();

  return {
    title,
    category: String(formData.get("category") ?? "").trim() || null,
    genre: String(formData.get("genre") ?? "").trim() || null,
    servings: servingsRaw ? Number(servingsRaw) : null,
    instructions: String(formData.get("instructions") ?? "").trim() || null,
    memo: String(formData.get("memo") ?? "").trim() || null,
    recipe_url: String(formData.get("recipe_url") ?? "").trim() || null,
  };
}

type ParsedIngredientRow = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

function parseIngredientRows(formData: FormData): ParsedIngredientRow[] {
  const names = formData.getAll("ingredient_name").map(String);
  const quantities = formData.getAll("ingredient_quantity").map(String);
  const units = formData.getAll("ingredient_unit").map(String);

  return names
    .map((name, i) => ({
      name: name.trim(),
      quantity: quantities[i]?.trim() ? Number(quantities[i]) : null,
      unit: units[i]?.trim() || null,
    }))
    .filter((row) => row.name.length > 0);
}

async function uploadPhotoIfProvided(
  supabase: SupabaseServerClient,
  formData: FormData,
  familyId: string
): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${familyId}/${randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error } = await supabase.storage
    .from("recipe-photos")
    .upload(path, file, { contentType: file.type || undefined });

  if (error) {
    throw new Error(`写真のアップロードに失敗しました: ${error.message}`);
  }

  const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function resolveIngredientId(
  supabase: SupabaseServerClient,
  name: string
): Promise<string> {
  const { data, error } = await supabase
    .from("ingredients_master")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`食材マスタの登録に失敗しました: ${error.message}`);
  }

  return data.id;
}

async function saveRecipeIngredients(
  supabase: SupabaseServerClient,
  recipeId: string,
  rows: ParsedIngredientRow[]
) {
  const { error: deleteError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);

  if (deleteError) {
    throw new Error(`材料の更新に失敗しました: ${deleteError.message}`);
  }

  if (rows.length === 0) return;

  const ingredientIds = await Promise.all(
    rows.map((row) => resolveIngredientId(supabase, row.name))
  );

  const { error: insertError } = await supabase.from("recipe_ingredients").insert(
    rows.map((row, i) => ({
      recipe_id: recipeId,
      ingredient_id: ingredientIds[i],
      quantity: row.quantity,
      unit: row.unit,
    }))
  );

  if (insertError) {
    throw new Error(`材料の保存に失敗しました: ${insertError.message}`);
  }
}

export async function createRecipe(formData: FormData) {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();
  const fields = parseRecipeFields(formData);
  const ingredientRows = parseIngredientRows(formData);
  const photoUrl = await uploadPhotoIfProvided(supabase, formData, familyId);

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({ ...fields, photo_url: photoUrl, family_id: familyId })
    .select("id")
    .single();

  if (error) {
    throw new Error(`レシピの登録に失敗しました: ${error.message}`);
  }

  await saveRecipeIngredients(supabase, recipe.id, ingredientRows);

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: string, formData: FormData) {
  const supabase = await createClient();
  const familyId = await getCurrentFamilyId();
  const fields = parseRecipeFields(formData);
  const ingredientRows = parseIngredientRows(formData);
  const photoUrl = await uploadPhotoIfProvided(supabase, formData, familyId);

  const { error } = await supabase
    .from("recipes")
    .update({ ...fields, ...(photoUrl ? { photo_url: photoUrl } : {}) })
    .eq("id", id);

  if (error) {
    throw new Error(`レシピの更新に失敗しました: ${error.message}`);
  }

  await saveRecipeIngredients(supabase, id, ingredientRows);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) {
    throw new Error(`レシピの削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function toggleFavorite(id: string, nextValue: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ is_favorite: nextValue })
    .eq("id", id);

  if (error) {
    throw new Error(`いいねの更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}
