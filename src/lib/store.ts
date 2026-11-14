import { Redis } from "@upstash/redis";

export interface StoredPuzzle {
  date: string;
  number: number;
  theme: string;
  /** Original phrase with punctuation, shown when the game ends. */
  phrase: string;
  /** Normalized words used for checking guesses. */
  words: string[];
  acronym: string;
  clue: string;
  source: "claude" | "backup";
  createdAt: string;
}

export interface PuzzleStore {
  get(date: string): Promise<StoredPuzzle | null>;
  /** Saves only if no puzzle exists for that date yet. Returns whether it was saved. */
  setIfAbsent(puzzle: StoredPuzzle): Promise<boolean>;
  recentPhrases(limit: number): Promise<string[]>;
  acquireLock(date: string, seconds: number): Promise<boolean>;
  releaseLock(date: string): Promise<void>;
}

const RECENT_KEY = "acronyle:recent";
const RECENT_MAX = 120;
const puzzleKey = (date: string) => `acronyle:puzzle:${date}`;
const lockKey = (date: string) => `acronyle:lock:${date}`;

class RedisStore implements PuzzleStore {
  constructor(private redis: Redis) {}

  async get(date: string) {
    return (await this.redis.get<StoredPuzzle>(puzzleKey(date))) ?? null;
  }

  async setIfAbsent(puzzle: StoredPuzzle) {
    const ok = await this.redis.set(puzzleKey(puzzle.date), puzzle, { nx: true });
    if (ok) {
      await this.redis.lpush(RECENT_KEY, puzzle.phrase);
      await this.redis.ltrim(RECENT_KEY, 0, RECENT_MAX - 1);
    }
    return ok === "OK";
  }

  async recentPhrases(limit: number) {
    return this.redis.lrange<string>(RECENT_KEY, 0, limit - 1);
  }

  async acquireLock(date: string, seconds: number) {
    return (await this.redis.set(lockKey(date), "1", { nx: true, ex: seconds })) === "OK";
  }

  async releaseLock(date: string) {
    await this.redis.del(lockKey(date));
  }
}

/** Local-dev fallback when no Redis env vars are set. Lost on server restart. */
class MemoryStore implements PuzzleStore {
  private puzzles = new Map<string, StoredPuzzle>();
  private recent: string[] = [];
  private locks = new Map<string, number>();

  async get(date: string) {
    return this.puzzles.get(date) ?? null;
  }

  async setIfAbsent(puzzle: StoredPuzzle) {
    if (this.puzzles.has(puzzle.date)) return false;
    this.puzzles.set(puzzle.date, puzzle);
    this.recent = [puzzle.phrase, ...this.recent].slice(0, RECENT_MAX);
    return true;
  }

  async recentPhrases(limit: number) {
    return this.recent.slice(0, limit);
  }

  async acquireLock(date: string, seconds: number) {
    const until = this.locks.get(date);
    if (until && until > Date.now()) return false;
    this.locks.set(date, Date.now() + seconds * 1000);
    return true;
  }

  async releaseLock(date: string) {
    this.locks.delete(date);
  }
}

const globalForStore = globalThis as unknown as { __acronyleStore?: PuzzleStore };

export function getStore(): PuzzleStore {
  if (globalForStore.__acronyleStore) return globalForStore.__acronyleStore;

  // Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  let store: PuzzleStore;
  if (url && token) {
    store = new RedisStore(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("[acronyle] No Redis env vars found; using in-memory puzzle store.");
    }
    store = new MemoryStore();
  }
  globalForStore.__acronyleStore = store;
  return store;
}
