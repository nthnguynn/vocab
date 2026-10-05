/**
 * Utilities for sentence splitting, word tokenization, cloze masking, and text diffing.
 */

export interface WordToken {
  index: number;
  raw: string; // "don't,"
  word: string; // "don't" (no boundary punctuation)
  cleanWord: string; // lowercase alphanumeric for matching
  leadingPunct: string; // e.g. "\""
  trailingPunct: string; // e.g. ",\""
}

export function splitSentences(text: string): string[] {
  if (!text) return [];
  // Split on sentence-ending punctuation followed by space or newline, while keeping punctuation
  const cleaned = text.trim().replace(/\r\n/g, "\n");
  const regex = /([^.!?\n]+[.!?]+(?:\s+|$)|[^\n]+(?:\n+|$))/g;
  const matches = cleaned.match(regex);
  if (!matches) return [cleaned];
  return matches.map((s) => s.trim()).filter(Boolean);
}

export function tokenizeWords(text: string): WordToken[] {
  if (!text) return [];
  const rawTokens = text.trim().split(/\s+/);
  return rawTokens.map((raw, index) => {
    // Separate leading/trailing punctuation while preserving apostrophes/hyphens inside words
    const match = raw.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
    const leadingPunct = match ? match[1] : "";
    const core = match ? match[2] : raw;
    const trailingPunct = match ? match[3] : "";
    const cleanWord = core.toLowerCase().replace(/[^a-z0-9]/gi, "");

    return {
      index,
      raw,
      word: core || raw,
      cleanWord,
      leadingPunct,
      trailingPunct,
    };
  });
}

/**
 * Creates cloze representation for a word.
 * - 'full': the word itself
 * - 'first_letter': "Y____" (letter + underscores)
 * - 'dots': "•••••"
 * - 'blank': "_____"
 */
export function maskWord(
  word: string,
  mode: "full" | "first_letter" | "dots" | "blank"
): string {
  if (!word) return "";
  if (mode === "full") return word;
  if (mode === "first_letter") {
    if (word.length <= 1) return word;
    return word[0] + "·".repeat(Math.min(word.length - 1, 5));
  }
  if (mode === "dots") {
    return "•".repeat(Math.max(2, Math.min(word.length, 6)));
  }
  return "_____";
}

export interface DiffToken {
  text: string;
  status: "correct" | "missing" | "extra";
}

export interface RecitationDiffResult {
  accuracy: number; // 0 - 100
  matchedCount: number;
  totalWords: number;
  tokens: DiffToken[];
}

/**
 * Word-level diff using Longest Common Subsequence (LCS)
 */
export function calculateRecitationDiff(
  original: string,
  userText: string
): RecitationDiffResult {
  const origTokens = tokenizeWords(original);
  const userTokens = tokenizeWords(userText);

  const n = origTokens.length;
  const m = userTokens.length;

  if (n === 0) {
    return { accuracy: 100, matchedCount: 0, totalWords: 0, tokens: [] };
  }

  // LCS DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origTokens[i - 1].cleanWord === userTokens[j - 1].cleanWord) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = n;
  let j = m;
  const tokens: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      origTokens[i - 1].cleanWord === userTokens[j - 1].cleanWord
    ) {
      tokens.unshift({ text: origTokens[i - 1].raw, status: "correct" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ text: userTokens[j - 1].raw, status: "extra" });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      tokens.unshift({ text: origTokens[i - 1].raw, status: "missing" });
      i--;
    }
  }

  const matchedCount = dp[n][m];
  const accuracy = Math.round((matchedCount / n) * 100);

  return {
    accuracy,
    matchedCount,
    totalWords: n,
    tokens,
  };
}

export function estimateReadingTimeSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Average speaking pace: 130 words per minute
  return Math.max(10, Math.round((words / 130) * 60));
}
