import { normalizeWord } from "./normalize";

export const MIN_WORDS = 6;
export const MAX_WORDS = 16;

/** ceil(words / 2) + 2, clamped to 4–10. */
export function maxGuesses(wordCount: number): number {
  return Math.min(10, Math.max(4, Math.ceil(wordCount / 2) + 2));
}

/** Returns an error message for an invalid guess, or null when it can be submitted. */
export function validateGuess(
  guess: string[],
  acronym: string,
  previous: string[][] = [],
): string | null {
  const words = guess.map(normalizeWord);
  if (words.length !== acronym.length) return "Fill in every word";
  for (let i = 0; i < words.length; i++) {
    if (!words[i]) return "Fill in every word";
    if (words[i][0] !== acronym[i].toLowerCase()) {
      return `Word ${i + 1} must start with “${acronym[i]}”`;
    }
  }
  const key = words.join(" ");
  if (previous.some((p) => p.map(normalizeWord).join(" ") === key)) {
    return "You already tried that";
  }
  return null;
}
