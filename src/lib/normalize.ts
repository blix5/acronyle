/** Lowercase and strip everything except a-z / 0-9, so "Don't" === "dont". */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

/** Split a phrase into normalized words (spaces, hyphens, slashes and dashes all separate words). */
export function splitPhrase(phrase: string): string[] {
  return phrase
    .split(/[\s\-–—/]+/)
    .map(normalizeWord)
    .filter(Boolean);
}

export function acronymOf(words: string[]): string {
  return words.map((w) => w[0]).join("").toUpperCase();
}
