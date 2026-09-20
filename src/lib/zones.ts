// 機能ごとに「パッと見てどの機能か分かる」ようにするためのゾーン定義。
// ページ見出しのアイコンと、ヘッダーナビの現在地表示の両方で共通利用する。
// 操作ボタンの色(brand)はどのゾーンでも変えず統一感を保つ。

export const ZONES = {
  recipe: { icon: "🍳", bg: "bg-brand-100", text: "text-brand-800", label: "レシピを探す・登録する" },
  ai: { icon: "✨", bg: "bg-violet-100", text: "text-violet-700", label: "AIにレシピ・献立を考えてもらう" },
  shopping: { icon: "🛒", bg: "bg-green-100", text: "text-green-700", label: "食材リスト・買い物リスト" },
  family: { icon: "👪", bg: "bg-teal-100", text: "text-teal-700", label: "家族の招待・メンバー管理" },
  admin: { icon: "🛡️", bg: "bg-slate-200", text: "text-slate-700", label: "管理者専用の機能" },
} as const;

export type Zone = keyof typeof ZONES;
