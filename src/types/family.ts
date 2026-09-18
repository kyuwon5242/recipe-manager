export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type Family = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

export type FamilyMember = {
  family_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};
