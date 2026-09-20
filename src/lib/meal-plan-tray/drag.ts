import type { TraySlotAssignment } from "@/types/meal-plan-tray";

export const DRAG_MIME = "application/x-recipe-suggestion";

export function setDragPayload(e: React.DragEvent, payload: TraySlotAssignment) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
}

export function readDragPayload(e: React.DragEvent): TraySlotAssignment | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    return JSON.parse(raw) as TraySlotAssignment;
  } catch {
    return null;
  }
}
