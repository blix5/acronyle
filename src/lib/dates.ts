/** Puzzle #1 is this date. */
export const LAUNCH_DATE = "2026-11-14";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** The player's calendar date, YYYY-MM-DD in their own timezone. */
export function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function toUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isDateKey(key: string): boolean {
  if (!DATE_RE.test(key)) return false;
  return utcDateKey(new Date(toUtcMs(key))) === key;
}

export function addDays(key: string, days: number): string {
  return utcDateKey(new Date(toUtcMs(key) + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function puzzleNumber(key: string): number {
  return daysBetween(LAUNCH_DATE, key) + 1;
}

/** 0 = Sunday … 6 = Saturday, for the calendar date itself. */
export function weekdayOf(key: string): number {
  return new Date(toUtcMs(key)).getUTCDay();
}

/**
 * Somewhere on Earth it is currently "yesterday", "today" or "tomorrow" in UTC terms
 * (UTC-12 … UTC+14). Only those dates are served, so nobody can peek further ahead.
 */
export function isServableDate(key: string, now = new Date()): boolean {
  if (!isDateKey(key)) return false;
  const diff = daysBetween(utcDateKey(now), key);
  return diff >= -1 && diff <= 1 && key >= LAUNCH_DATE;
}

/** Milliseconds until the player's next local midnight. */
export function msUntilLocalMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
