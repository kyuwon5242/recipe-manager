export type Recipe = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  instructions: string | null;
  memo: string | null;
  recipe_url: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type IngredientMaster = {
  id: string;
  name: string;
  default_unit: string | null;
  category: string | null;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number | null;
  unit: string | null;
};
