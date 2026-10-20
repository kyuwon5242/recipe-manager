"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TRAY_GENRES, type TrayGenre, type TraySlot, type TraySlotAssignment } from "@/types/meal-plan-tray";

const STORAGE_KEY = "recipe-app.meal-plan-tray.v1";
const MEMO_STORAGE_KEY = "recipe-app.meal-plan-tray.memo.v1";
const MAX_PER_GENRE = 5;

function loadInitialMemo(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(MEMO_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function loadInitialSlots(): TraySlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 旧バージョン(品目ごとの枠数指定・空枠あり)のデータが残っていた場合は、
    // 空枠(assignment: null)を捨てて新形式(追加した分だけ並ぶ)に合わせる。
    return (parsed as TraySlot[]).filter(
      (s): s is TraySlot => Boolean(s && s.assignment)
    );
  } catch {
    return [];
  }
}

type MealPlanTrayContextValue = {
  slots: TraySlot[];
  // ドラッグ&ドロップが使いにくいスマホ向けの、ボタンタップによる追加。
  // 品目ごとの上限(5)に達していなければ新しい枠を作って末尾に追加する。
  // 追加できた場合はtrue、その品目の上限に達していてできなかった場合は
  // falseを返す。
  addToTray: (genre: TrayGenre, assignment: TraySlotAssignment) => boolean;
  removeSlot: (slotId: string) => void;
  setServings: (slotId: string, servings: number) => void;
  clearAll: () => void;
  // 登録済みレシピ(recipeIdを持つもの)がすでにトレイに入っているかどうか。
  // 追加ボタン側で「追加済み」の永続表示・再追加防止に使う。
  isRecipeInTray: (recipeId: string) => boolean;
  // 献立単位のメモ(確定前にトレイ側で入力できるようにしたもの)。
  // 食材リスト作成に進む際、買い物リストのmeal_memoへ引き継ぐ。
  mealMemo: string;
  setMealMemo: (value: string) => void;
};

const MealPlanTrayContext = createContext<MealPlanTrayContextValue | null>(null);

export function MealPlanTrayProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<TraySlot[]>([]);
  const [mealMemo, setMealMemoState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorageはサーバーで読めないため、SSRとのhydration不一致を避けて
    // マウント後にクライアント側だけで読み込む(lazy初期値にすると不一致になる)。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(loadInitialSlots());
    setMealMemoState(loadInitialMemo());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // localStorageが使えない環境では諦める(プライベートウィンドウ等)
    }
  }, [slots, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MEMO_STORAGE_KEY, mealMemo);
    } catch {
      // localStorageが使えない環境では諦める(プライベートウィンドウ等)
    }
  }, [mealMemo, hydrated]);

  const addToTray = useCallback((genre: TrayGenre, assignment: TraySlotAssignment): boolean => {
    let added = false;
    setSlots((prev) => {
      const genreCount = prev.filter((s) => s.genre === genre).length;
      if (genreCount >= MAX_PER_GENRE) {
        return prev;
      }
      added = true;
      const newSlot: TraySlot = {
        id: `${genre}-${crypto.randomUUID()}`,
        genre,
        servings: 2,
        assignment,
      };
      return [...prev, newSlot].sort(
        (a, b) => TRAY_GENRES.indexOf(a.genre) - TRAY_GENRES.indexOf(b.genre)
      );
    });
    return added;
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
  }, []);

  const setServings = useCallback((slotId: string, servings: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, servings: Math.max(1, servings) } : slot
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setSlots([]);
    setMealMemoState("");
  }, []);

  const isRecipeInTray = useCallback(
    (recipeId: string) =>
      slots.some((s) => s.assignment.kind === "existing" && s.assignment.recipeId === recipeId),
    [slots]
  );

  const setMealMemo = useCallback((value: string) => setMealMemoState(value), []);

  const value = useMemo(
    () => ({
      slots,
      addToTray,
      removeSlot,
      setServings,
      clearAll,
      isRecipeInTray,
      mealMemo,
      setMealMemo,
    }),
    [slots, addToTray, removeSlot, setServings, clearAll, isRecipeInTray, mealMemo, setMealMemo]
  );

  return <MealPlanTrayContext.Provider value={value}>{children}</MealPlanTrayContext.Provider>;
}

export function useMealPlanTray() {
  const ctx = useContext(MealPlanTrayContext);
  if (!ctx) {
    throw new Error("useMealPlanTray must be used within MealPlanTrayProvider");
  }
  return ctx;
}
