import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { BACKUP_PUZZLES } from "./backup-puzzles";
import { puzzleNumber, weekdayOf } from "./dates";
import { acronymOf, splitPhrase } from "./normalize";
import { MAX_WORDS, MIN_WORDS } from "./rules";
import type { StoredPuzzle } from "./store";
import { themeFor } from "./themes";

const MODEL = "claude-opus-5-5";
const MAX_ATTEMPTS = 3;

const PuzzleOutput = z.object({
  phrase: z.string().describe("The hidden phrase, written naturally with normal punctuation."),
  clue: z.string().describe("A short vibe clue about who says it or when, using none of the phrase's words."),
});

const SYSTEM = `You write the daily puzzle for Acronyle, a word game. Players see only the first letter of every word in a hidden phrase (for example IDECIYDTT for "I don't even care if you did that though") plus a short clue, and must guess every word.

What makes a good puzzle:
- A phrase real people would recognize or plausibly say. Once solved it should feel obvious ("oh, of course!"), but the first letters alone should not give it away.
- Plain everyday English words only. No digits, numbers written as digits, emoji, proper nouns, brand names, or profanity.
- Words separated by single spaces. Apostrophes are fine (players type "dont" for "don't"); avoid hyphenated words.
- Never use real quotes from films, TV, songs, books or famous people. Original lines only.
- The clue is at most 12 words, describes the situation or the kind of person who says it, and must not contain any word from the phrase.`;

function targetLength(date: string): number {
  // Deterministic per date so retries and redeploys aim for the same size.
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MIN_WORDS + (h % (MAX_WORDS - MIN_WORDS + 1));
}

export function checkCandidate(
  phrase: string,
  clue: string,
  recent: string[],
): string | null {
  const words = splitPhrase(phrase);
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) {
    return `has ${words.length} words; it must have ${MIN_WORDS}-${MAX_WORDS}`;
  }
  if (words.some((w) => !/^[a-z]/.test(w))) return "a word starts with a digit";
  if (words.some((w) => w.length > 14)) return "a word is too long";
  const key = words.join(" ");
  if (recent.some((r) => splitPhrase(r).join(" ") === key)) return "was used recently";
  const clueWords = new Set(splitPhrase(clue));
  const leaked = words.filter((w) => w.length > 3 && clueWords.has(w));
  if (leaked.length) return `the clue gives away "${leaked[0]}"`;
  if (!clue.trim() || clue.length > 120) return "the clue is missing or too long";
  return null;
}

function buildPuzzle(
  date: string,
  theme: string,
  phrase: string,
  clue: string,
  source: StoredPuzzle["source"],
): StoredPuzzle {
  const words = splitPhrase(phrase);
  return {
    date,
    number: puzzleNumber(date),
    theme,
    phrase: phrase.trim(),
    words,
    acronym: acronymOf(words),
    clue: clue.trim(),
    source,
    createdAt: new Date().toISOString(),
  };
}

async function askClaude(
  client: Anthropic,
  date: string,
  recent: string[],
  feedback: string | null,
) {
  const theme = themeFor(weekdayOf(date));
  const target = targetLength(date);
  const recentList = recent.length
    ? `\n\nDo not reuse or closely imitate any of these recent phrases:\n${recent.map((p) => `- ${p}`).join("\n")}`
    : "";
  const retry = feedback ? `\n\nYour previous attempt was rejected because it ${feedback}. Try a different phrase.` : "";

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(PuzzleOutput) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write the puzzle for ${date}.\n\nToday's theme is "${theme.name}": ${theme.guidance}\n\nAim for about ${target} words (anything from ${MIN_WORDS} to ${MAX_WORDS} is allowed if a better phrase needs it).${recentList}${retry}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude declined to write a puzzle");
  if (!response.parsed_output) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);
  return { theme: theme.name, ...response.parsed_output };
}

function backupPuzzle(date: string, recent: string[]): StoredPuzzle {
  const theme = themeFor(weekdayOf(date)).name;
  const recentKeys = new Set(recent.map((r) => splitPhrase(r).join(" ")));
  const fresh = BACKUP_PUZZLES.filter((p) => !recentKeys.has(splitPhrase(p.phrase).join(" ")));
  const pool = fresh.length ? fresh : BACKUP_PUZZLES;
  const pick = pool[Math.abs(puzzleNumber(date)) % pool.length];
  return buildPuzzle(date, theme, pick.phrase, pick.clue, "backup");
}

/** Asks Claude for a puzzle, validating and retrying; falls back to the backup list. Never throws. */
export async function generatePuzzle(date: string, recent: string[]): Promise<StoredPuzzle> {
  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch (err) {
    console.error("[acronyle] Anthropic client unavailable, using backup puzzle:", err);
    return backupPuzzle(date, recent);
  }

  let feedback: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const out = await askClaude(client, date, recent, feedback);
      const problem = checkCandidate(out.phrase, out.clue, recent);
      if (!problem) return buildPuzzle(date, out.theme, out.phrase, out.clue, "claude");
      feedback = problem;
      console.warn(`[acronyle] attempt ${attempt} rejected: "${out.phrase}" ${problem}`);
    } catch (err) {
      console.error(`[acronyle] attempt ${attempt} failed:`, err);
      const noCredentials = err instanceof Error && /authentication method/i.test(err.message);
      if (noCredentials || err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        break;
      }
    }
  }
  return backupPuzzle(date, recent);
}

