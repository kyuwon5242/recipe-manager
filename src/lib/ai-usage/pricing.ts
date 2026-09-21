// 2026年9月時点のAnthropic公式価格($/100万トークン)。変更されていないか
// https://www.anthropic.com/pricing で定期的に確認すること。あくまで概算
// コスト表示用で、実際の請求額と一致するとは限らない(キャッシュ割引等は
// 考慮していない)。
const PRICING_USD_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = PRICING_USD_PER_MILLION_TOKENS[model];
  if (!rate) return 0;
  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}
