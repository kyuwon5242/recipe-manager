"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold">エラーが発生しました</h1>
      <p className="mt-2 text-sm text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
      >
        再試行
      </button>
    </div>
  );
}
