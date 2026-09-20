"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={
        className ??
        "rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
      }
    >
      {pending ? (pendingLabel ?? "処理中...") : label}
    </button>
  );
}
