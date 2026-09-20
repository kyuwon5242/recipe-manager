export type ShoppingList = {
  id: string;
  family_id: string;
  created_by: string;
  title: string;
  created_at: string;
};

export type ShoppingListItem = {
  id: string;
  shopping_list_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  position: number;
  is_checked: boolean;
};

export type DraftItem = {
  key: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
};

export type BuilderIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
};

export type BuilderRecipe = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  is_favorite: boolean;
  ingredients: BuilderIngredient[];
};

export type InitialSelection = {
  id: string;
  servings: number | null;
};
