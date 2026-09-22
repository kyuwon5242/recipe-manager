import Link from "next/link";
import { requireAdmin } from "@/lib/admin/current";
import { AdminUserRow, type AdminUserRowData } from "@/components/AdminUserRow";
import { ZoneIcon } from "@/components/ZoneIcon";

export const metadata = { title: "ユーザー管理" };

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  can_use_menu_agent: boolean;
  can_use_ai_features: boolean;
};

type MembershipRow = {
  user_id: string;
  families: { name: string } | null;
};

export default async function AdminUsersPage() {
  const { supabase, userId } = await requireAdmin();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, display_name, is_admin, is_suspended, can_use_menu_agent, can_use_ai_features")
    .order("email", { ascending: true })
    .returns<ProfileRow[]>();

  if (profilesError) {
    throw new Error(`ユーザー一覧の取得に失敗しました: ${profilesError.message}`);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("family_members")
    .select("user_id, families(name)")
    .returns<MembershipRow[]>();

  if (membershipsError) {
    throw new Error(`家族情報の取得に失敗しました: ${membershipsError.message}`);
  }

  const familyByUserId = new Map(
    (memberships ?? []).map((m) => [m.user_id, m.families?.name ?? null])
  );

  const users: AdminUserRowData[] = profiles.map((p) => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    familyName: familyByUserId.get(p.id) ?? null,
    isAdmin: p.is_admin,
    isSuspended: p.is_suspended,
    canUseMenuAgent: p.can_use_menu_agent,
    canUseAiFeatures: p.can_use_ai_features,
    isSelf: p.id === userId,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← 管理者ダッシュボードに戻る
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ZoneIcon zone="admin" />
        <h1 className="text-2xl font-bold">ユーザー管理 - {users.length}人</h1>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        管理者権限の付与はSQLから行う運用のため、この画面からは変更できません。
      </p>
      <ul className="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
        {users.map((user) => (
          <AdminUserRow key={user.id} user={user} />
        ))}
      </ul>
    </div>
  );
}
