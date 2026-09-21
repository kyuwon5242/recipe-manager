"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToTrayButton } from "@/components/AddToTrayButton";
import { GENRE_TABS, bucketGenre } from "@/lib/recipe-genre";
import { getCategoryColor } from "@/lib/category-color";
import { setDragPayload } from "@/lib/meal-plan-tray/drag";

type RecipeListItem = {
  id: string;
  title: string;
  category: string | null;
  genre: string | null;
  servings: number | null;
  is_favorite: boolean;
  ingredientNames: string[];
};

const TABS = ["すべて", ...GENRE_TABS] as const;

export function RecipeListClient({ recipes }: { recipes: RecipeListItem[] }) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("すべて");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("すべて");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const recipe of recipes) {
      if (recipe.category?.trim()) set.add(recipe.category.trim());
    }
    return Array.from(set);
  }, [recipes]);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (activeTab !== "すべて" && bucketGenre(recipe.genre) !== activeTab) return false;
      if (categoryFilter !== "すべて" && recipe.category !== categoryFilter) return false;
      if (favoriteOnly && !recipe.is_favorite) return false;
      if (query) {
        const titleMatch = recipe.title.toLowerCase().includes(query);
        const ingredientMatch = recipe.ingredientNames.some((name) =>
          name.toLowerCase().includes(query)
        );
        if (!titleMatch && !ingredientMatch) return false;
      }
      return true;
    });
  }, [recipes, activeTab, categoryFilter, favoriteOnly, searchText]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              activeTab === tab
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="料理名・食材で検索"
          className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="すべて">カテゴリ: すべて</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFavoriteOnly((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${
            favoriteOnly
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {favoriteOnly ? "♥ お気に入りのみ表示中" : "♡ お気に入りのみ表示"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">該当するレシピがありません。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => {
            const color = getCategoryColor(recipe.category);
            return (
              <li key={recipe.id} className="relative">
                <Link
                  href={`/recipes/${recipe.id}`}
                  draggable
                  onDragStart={(e) =>
                    setDragPayload(e, {
                      kind: "existing",
                      recipeId: recipe.id,
                      title: recipe.title,
                      category: recipe.category,
                      genre: recipe.genre,
                    })
                  }
                  className="block h-full cursor-grab rounded-lg border border-gray-200 bg-white p-4 pb-11 shadow-raised transition hover:-translate-y-0.5 hover:border-brand-500 active:cursor-grabbing"
                >
                  <p className="pr-8 font-semibold">{recipe.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {recipe.category ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
                      >
                        {recipe.category}
                      </span>
                    ) : null}
                    {recipe.genre ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {recipe.genre}
                      </span>
                    ) : null}
                    {recipe.servings ? (
                      <span className="text-xs text-gray-400">{recipe.servings}人前</span>
                    ) : null}
                  </div>
                </Link>
                <div className="absolute right-3 top-3">
                  <FavoriteButton recipeId={recipe.id} isFavorite={recipe.is_favorite} />
                </div>
                <div className="absolute inset-x-3 bottom-3 flex justify-end">
                  <AddToTrayButton
                    genre={recipe.genre}
                    assignment={{
                      kind: "existing",
                      recipeId: recipe.id,
                      title: recipe.title,
                      category: recipe.category,
                      genre: recipe.genre,
                    }}
                    className="max-w-full truncate rounded-full border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 active:scale-95"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
