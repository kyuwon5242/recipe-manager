"use client";

import type { ReactNode } from "react";
import { MealPlanTrayPanel } from "@/components/MealPlanTrayPanel";

export function WithMealPlanTray({
  children,
  maxWidth = "max-w-2xl",
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-start">
      <div className={`min-w-0 flex-1 ${maxWidth}`}>{children}</div>
      <MealPlanTrayPanel />
    </div>
  );
}
