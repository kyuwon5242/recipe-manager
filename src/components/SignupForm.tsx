"use client";

import { useActionState } from "react";
import { signUpWithPassword, type SignupState } from "@/app/signup/actions";

const initialState: SignupState = { error: null, message: null };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUpWithPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <input
          type="email"
          name="email"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          パスワード(6文字以上)
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.message ? (
        <p className="text-sm text-brand-700">{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-brand transition hover:bg-brand-700 active:scale-95 active:bg-brand-800 disabled:opacity-50 disabled:active:scale-100"
      >
        {isPending ? "登録中..." : "新規登録"}
      </button>
    </form>
  );
}
