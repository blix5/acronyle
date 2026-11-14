import { normalizeWord } from "./normalize";

export type Mark = "correct" | "present" | "absent";

/**
 * Wordle-style scoring, per word:
 * - correct: right word in the right slot
 * - present: the word is in the phrase, in a slot not already matched
 * - absent:  not in the phrase (or every copy is already accounted for)
 */
export function scoreGuess(guess: string[], answer: string[]): Mark[] {
  const g = guess.map(normalizeWord);
  const marks: Mark[] = answer.map(() => "absent");
  const leftover = new Map<string, number>();

  answer.forEach((word, i) => {
    if (g[i] === word) marks[i] = "correct";
    else leftover.set(word, (leftover.get(word) ?? 0) + 1);
  });

  g.forEach((word, i) => {
    if (marks[i] === "correct") return;
    const count = leftover.get(word) ?? 0;
    if (count > 0) {
      marks[i] = "present";
      leftover.set(word, count - 1);
    }
  });

  return marks;
}

export function isSolved(marks: Mark[]): boolean {
  return marks.every((m) => m === "correct");
}
