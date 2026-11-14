import type { Mark } from "./scoring";
import { addDays } from "./dates";

export type Status = "playing" | "won" | "lost";

export interface SavedGame {
  date: string;
  guesses: string[][];
  marks: Mark[][];
  status: Status;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** guesses-used → count of wins */
  distribution: Record<string, number>;
  lastPlayedDate: string | null;
  lastWinDate: string | null;
}

export type ThemePref = "light" | "dark" | "system";

const KEYS = {
  game: (date: string) => `acronyle:game:${date}`,
  stats: "acronyle:stats",
  theme: "acronyle:theme",
  seenHelp: "acronyle:seen-help",
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, quota) — the game still works for this session */
  }
}

export const loadGame = (date: string) => read<SavedGame>(KEYS.game(date));
export const saveGame = (game: SavedGame) => write(KEYS.game(game.date), game);

export const EMPTY_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: {},
  lastPlayedDate: null,
  lastWinDate: null,
};

export function loadStats(): Stats {
  return { ...EMPTY_STATS, ...read<Stats>(KEYS.stats) };
}

/** Records a finished game once per date and returns the new stats. */
export function recordResult(date: string, won: boolean, guessesUsed: number): Stats {
  const s = loadStats();
  if (s.lastPlayedDate === date) return s;
  const next: Stats = { ...s, distribution: { ...s.distribution }, played: s.played + 1, lastPlayedDate: date };
  if (won) {
    next.wins += 1;
    next.currentStreak = s.lastWinDate === addDays(date, -1) ? s.currentStreak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
    next.lastWinDate = date;
    next.distribution[guessesUsed] = (next.distribution[guessesUsed] ?? 0) + 1;
  } else {
    next.currentStreak = 0;
  }
  write(KEYS.stats, next);
  return next;
}

/** The streak only counts if the last win was today or yesterday. */
export function liveStreak(s: Stats, today: string): number {
  if (!s.lastWinDate) return 0;
  return s.lastWinDate === today || s.lastWinDate === addDays(today, -1) ? s.currentStreak : 0;
}

export function loadThemePref(): ThemePref {
  const t = safeRaw(KEYS.theme);
  return t === "light" || t === "dark" ? t : "system";
}

function safeRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const saveThemePref = (t: ThemePref) => write(KEYS.theme, t);
export const hasSeenHelp = () => safeRaw(KEYS.seenHelp) === "1";
export const markHelpSeen = () => write(KEYS.seenHelp, "1");
