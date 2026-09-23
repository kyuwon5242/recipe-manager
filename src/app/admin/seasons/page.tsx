import { requireAdmin } from "@/lib/admin/current";
import { ZoneIcon } from "@/components/ZoneIcon";
import { SeasonGenerateForm } from "@/components/SeasonGenerateForm";
import { SeasonEditRow } from "@/components/SeasonEditRow";
import { categoryIcon, sortByCategoryOrder, UNCATEGORIZED_LABEL } from "@/lib/ingredients/categories";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "旬データの整備" };
export const maxDuration = 60;

export default async function SeasonsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("ingredients_master")
    .select("id, name, category, season_months")
    .order("name");

  if (error) {
    throw new Error(`食材マスタの取得に失敗しました: ${error.message}`);
  }

  const items = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string | null) ?? UNCATEGORIZED_LABEL,
    season_months: r.season_months as number[] | null,
  }));

  const grouped = sortByCategoryOrder(items).reduce<Map<string, typeof items>>((map, item) => {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
    return map;
  }, new Map());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">旬データの整備</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        ゲーム要素(食材カード)のガチャ確率調整に使う「旬の月」を食材マスタに設定します。AIで未設定の食材に一括生成した後、内容を確認して必要に応じて修正してください(調味料など旬が無い食材は空欄のままで構いません)。
      </p>
      <div className="mt-6">
        <SeasonGenerateForm />
      </div>

      <div className="mt-8 space-y-6">
        {Array.from(grouped.entries()).map(([category, list]) => (
          <div key={category}>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
              <span aria-hidden="true">{categoryIcon(category)}</span>
              {category}
            </h2>
            <ul className="mt-2">
              {list.map((item) => (
                <SeasonEditRow
                  key={item.id}
                  ingredientId={item.id}
                  name={item.name}
                  initialMonths={item.season_months}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
