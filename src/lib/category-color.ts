const PALETTE = [
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-lime-100", text: "text-lime-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
];

const PRESET: Record<string, { bg: string; text: string }> = {
  和食: { bg: "bg-emerald-100", text: "text-emerald-700" },
  洋食: { bg: "bg-blue-100", text: "text-blue-700" },
  中華: { bg: "bg-rose-100", text: "text-rose-700" },
  韓国: { bg: "bg-pink-100", text: "text-pink-700" },
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(category: string | null): { bg: string; text: string } {
  if (!category || !category.trim()) {
    return { bg: "bg-gray-100", text: "text-gray-600" };
  }
  const trimmed = category.trim();
  if (PRESET[trimmed]) return PRESET[trimmed];
  return PALETTE[hashString(trimmed) % PALETTE.length];
}
