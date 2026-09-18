import { FamilySetupForms } from "@/components/FamilySetupForms";

export const metadata = { title: "家族の設定" };

export default function FamilySetupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">家族を設定してください</h1>
      <p className="mt-2 text-sm text-gray-500">
        レシピを共有するには、家族を新しく作るか、既存の家族に招待コードで参加する必要があります。
      </p>
      <FamilySetupForms />
    </div>
  );
}
