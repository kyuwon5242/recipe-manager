// 開発用テストアカウントに、動作確認したいカードを所持させる(テストデータ)。
// 使い方: node --env-file=.env.local scripts/grant-test-cards.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DEV_TEST_LOGIN_EMAIL;
const password = process.env.DEV_TEST_LOGIN_PASSWORD;

const TARGET_NAMES = [
  "きゅうり", "大根", "人参", "ごぼう", "れんこん", "長ネギ", "小松菜", // 細長い食材(見切れ修正の確認用)
  "トマト", "あわび", "うに", "ズワイガニ", "シャインマスカット", "初ガツオ", // レアリティ変更の確認用
  "舞茸", "エリンギ", "水菜", "豆苗", "ツナ缶", // トーン書き直しの確認用
];

const supabase = createClient(url, anonKey);

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) { console.error("sign in failed:", signInError.message); process.exit(1); }
const userId = signInData.user.id;

const { data: membership, error: memberError } = await supabase
  .from("family_members")
  .select("family_id")
  .eq("user_id", userId)
  .limit(1)
  .single();
if (memberError) { console.error("family lookup failed:", memberError.message); process.exit(1); }
const familyId = membership.family_id;

const { data: cards, error: cardsError } = await supabase
  .from("game_cards")
  .select("id, ingredients_master(name)")
  .returns();
if (cardsError) { console.error("cards fetch failed:", cardsError.message); process.exit(1); }

const targetCards = cards.filter((c) => TARGET_NAMES.includes(c.ingredients_master?.name));
console.log(`found ${targetCards.length} / ${TARGET_NAMES.length} target cards`);

for (const card of targetCards) {
  const { error } = await supabase.from("family_cards").upsert(
    {
      family_id: familyId,
      card_id: card.id,
      owned_count: 1,
      first_acquired_by: userId,
      first_acquired_at: new Date().toISOString(),
    },
    { onConflict: "family_id,card_id", ignoreDuplicates: false }
  );
  if (error) {
    console.error(`  failed for ${card.ingredients_master?.name}:`, error.message);
  } else {
    console.log(`  granted: ${card.ingredients_master?.name}`);
  }
}
