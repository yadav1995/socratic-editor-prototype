/**
 * 2M token context window estimation (Architecture §8.3).
 */
const MAX_TOKENS = 2_000_000;
const CHARS_PER_TOKEN = 4;

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function computeWindow(sources) {
  let totalChars = 0;
  const breakdown = [];

  for (const source of sources) {
    const chars = (source.content || source.name || '').length;
    const tokens = estimateTokens(source.content || source.name || '');
    totalChars += chars;
    breakdown.push({ name: source.name, chars, tokens });
  }

  const totalTokens = estimateTokens(String(totalChars)) + breakdown.reduce((s, b) => s + b.tokens, 0);
  const usedTokens = breakdown.reduce((s, b) => s + b.tokens, 0);
  const pct = Math.min(Math.round((usedTokens / MAX_TOKENS) * 10000) / 100, 100);

  return {
    maxTokens: MAX_TOKENS,
    usedTokens,
    remainingTokens: MAX_TOKENS - usedTokens,
    utilizationPct: pct,
    active: usedTokens < MAX_TOKENS,
    label: usedTokens < MAX_TOKENS
      ? `Context Fully Grounded (2M Window Active · ${pct}% used)`
      : 'Context Window Exceeded — trim sources',
    breakdown,
  };
}

module.exports = { estimateTokens, computeWindow, MAX_TOKENS };
