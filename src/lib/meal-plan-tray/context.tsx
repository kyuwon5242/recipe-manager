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
const MAX_PER_GENRE = 5;

function loadInitialSlots(): TraySlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TraySlot[]) : [];
  } catch {
    return [];
  }
}

function rebuildGenreSlots(slots: TraySlot[], genre: TrayGenre, count: number): TraySlot[] {
  const others = slots.filter((s) => s.genre !== genre);
  const current = slots.filter((s) => s.genre === genre);
  const next: TraySlot[] = [];
  for (let i = 0; i < count; i++) {
    next.push(
      current[i] ?? {
        id: `${genre}-${crypto.randomUUID()}`,
        genre,
        servings: 2,
        assignment: null,
      }
    );
  }
  return [...others, ...next].sort(
    (a, b) => TRAY_GENRES.indexOf(a.genre) - TRAY_GENRES.indexOf(b.genre)
  );
}

type MealPlanTrayContextValue = {
  slots: TraySlot[];
  setCount: (genre: TrayGenre, count: number) => void;
  assign: (slotId: string, assignment: TraySlotAssignment) => void;
  clearSlot: (slotId: string) => void;
  setServings: (slotId: string, servings: number) => void;
  clearAll: () => void;
  // ドラッグ&ドロップが使いにくいスマホ向けの、ボタンタップによる追加。
  // 空いている枠があればそこに、無ければ(上限内で)新しい枠を作って設定する。
  // 追加できた場合はtrue、その品目の上限に達していてできなかった場合はfalseを返す。
  addToTray: (genre: TrayGenre, assignment: TraySlotAssignment) => boolean;
};

const MealPlanTrayContext = createContext<MealPlanTrayContextValue | null>(null);

export function MealPlanTrayProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<TraySlot[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorageはサーバーで読めないため、SSRとのhydration不一致を避けて
    // マウント後にクライアント側だけで読み込む(lazy初期値にすると不一致になる)。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(loadInitialSlots());
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

  const setCount = useCallback((genre: TrayGenre, count: number) => {
    const clamped = Math.max(0, Math.min(MAX_PER_GENRE, count));
    setSlots((prev) => rebuildGenreSlots(prev, genre, clamped));
  }, []);

  const assign = useCallback((slotId: string, assignment: TraySlotAssignment) => {
    setSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, assignment } : slot)));
  }, []);

  const clearSlot = useCallback((slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, assignment: null } : slot))
    );
  }, []);

  const setServings = useCallback((slotId: string, servings: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, servings: Math.max(1, servings) } : slot
      )
    );
  }, []);

  const clearAll = useCallback(() => setSlots([]), []);

  const addToTray = useCallback((genre: TrayGenre, assignment: TraySlotAssignment): boolean => {
    let added = false;
    setSlots((prev) => {
      const emptySlot = prev.find((s) => s.genre === genre && !s.assignment);
      if (emptySlot) {
        added = true;
        return prev.map((s) => (s.id === emptySlot.id ? { ...s, assignment } : s));
      }
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

  const value = useMemo(
    () => ({ slots, setCount, assign, clearSlot, setServings, clearAll, addToTray }),
    [slots, setCount, assign, clearSlot, setServings, clearAll, addToTray]
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
