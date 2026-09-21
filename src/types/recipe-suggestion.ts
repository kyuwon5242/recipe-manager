export type RecipePrefill = {
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  instructions: string | null;
  memo: string | null;
  recipe_url: string | null;
};

export type IngredientPrefill = { name: string; quantity: string; unit: string };

export type NewRecipeIdea = {
  title: string;
  reason: string;
  recipe: RecipePrefill;
  ingredients: IngredientPrefill[];
};

export type ExistingRecipeSuggestion = {
  recipe_id: string;
  title: string;
  reason: string;
};
