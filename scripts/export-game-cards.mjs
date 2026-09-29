// 食材図鑑カードの現在の内容を読み取り専用で一覧出力する(DBへの書き込みなし)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DEV_TEST_LOGIN_EMAIL;
const password = process.env.DEV_TEST_LOGIN_PASSWORD;

const supabase = createClient(url, anonKey);

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error("sign in failed:", signInError.message);
  process.exit(1);
}

const { data: cards, error } = await supabase
  .from("game_cards")
  .select(
    "id, rarity, illustration_url, trivia_kids_text, trivia_adult_text, nutrition_summary, ingredients_master(id, name, category, season_months, reading)"
  )
  .order("created_at", { ascending: true });

if (error) {
  console.error("query failed:", error.message);
  process.exit(1);
}

console.log(JSON.stringify(cards, null, 2));
console.error(`\n--- total: ${cards.length} cards ---`);
