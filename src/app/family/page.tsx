import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FamilySettingsPanel } from "@/components/FamilySettingsPanel";

export const metadata = { title: "家族設定" };

type MembershipRow = {
  role: "owner" | "member";
  families: {
    id: string;
    name: string;
    invite_code: string;
  } | null;
};

type MemberRow = {
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
};

export default async function FamilyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("role, families(id, name, invite_code)")
    .eq("user_id", user.id)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error(`家族情報の取得に失敗しました: ${membershipError.message}`);
  }
  if (!membership || !membership.families) {
    redirect("/family/setup");
  }

  const family = membership.families;

  const { data: members, error: membersError } = await supabase
    .from("family_members")
    .select("user_id, role, joined_at, profiles(display_name, email)")
    .eq("family_id", family.id)
    .order("joined_at", { ascending: true })
    .returns<MemberRow[]>();

  if (membersError) {
    throw new Error(`メンバー一覧の取得に失敗しました: ${membersError.message}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{family.name}</h1>
      <p className="mt-1 text-sm text-gray-500">家族設定</p>

      <div className="mt-6">
        <FamilySettingsPanel
          familyId={family.id}
          familyName={family.name}
          inviteCode={family.invite_code}
          isOwner={membership.role === "owner"}
        />
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">メンバー ({members?.length ?? 0}人)</h2>
        <ul className="mt-2 divide-y divide-gray-100">
          {(members ?? []).map((member) => (
            <li
              key={member.user_id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>
                {member.profiles?.display_name ?? member.profiles?.email ?? "unknown"}
                {member.user_id === user.id ? "(あなた)" : ""}
              </span>
              <span className="text-gray-400">
                {member.role === "owner" ? "owner" : "member"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
