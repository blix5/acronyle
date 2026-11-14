import { generatePuzzle } from "./generate";
import { maxGuesses } from "./rules";
import { encodeAnswer } from "./obfuscate";
import { getStore, type StoredPuzzle } from "./store";

const LOCK_SECONDS = 120;
const RECENT_LIMIT = 60;

export interface PublicPuzzle {
  date: string;
  number: number;
  theme: string;
  acronym: string;
  clue: string;
  wordCount: number;
  maxGuesses: number;
  /** Obfuscated phrase; decode with decodeAnswer(answer, date). */
  answer: string;
}

export function toPublic(p: StoredPuzzle): PublicPuzzle {
  return {
    date: p.date,
    number: p.number,
    theme: p.theme,
    acronym: p.acronym,
    clue: p.clue,
    wordCount: p.words.length,
    maxGuesses: maxGuesses(p.words.length),
    answer: encodeAnswer(p.phrase, p.date),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Returns the stored puzzle for a date, generating it (once, under a lock) if missing. */
export async function getOrCreatePuzzle(date: string): Promise<StoredPuzzle> {
  const store = getStore();
  const existing = await store.get(date);
  if (existing) return existing;

  if (await store.acquireLock(date, LOCK_SECONDS)) {
    try {
      const again = await store.get(date);
      if (again) return again;
      const puzzle = await generatePuzzle(date, await store.recentPhrases(RECENT_LIMIT));
      await store.setIfAbsent(puzzle);
      return (await store.get(date)) ?? puzzle;
    } finally {
      await store.releaseLock(date);
    }
  }

  // Someone else is generating it; wait for their result.
  for (let i = 0; i < LOCK_SECONDS; i++) {
    await sleep(1000);
    const p = await store.get(date);
    if (p) return p;
  }
  throw new Error(`Timed out waiting for puzzle ${date}`);
}
