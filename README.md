# Acronyle

A daily word game. You get an acronym like **IDECIYDTT** and a short clue, and you guess the word behind every letter ("I don't even care if you did that though").

- **Green**: right word, right spot (locked in for your next guess)
- **Yellow**: the word is in the phrase, but in another spot
- **Gray**: not in the phrase

Longer acronyms get more guesses: `ceil(words / 2) + 2`, between 4 and 10.

## How it works

- **Puzzle generation**: once per day, `claude-opus-5-5` writes a phrase and a clue for that weekday's theme (`src/lib/themes.ts`). The server checks it (6–16 words, no digits, clue doesn't leak words, not a recent repeat) and retries up to 3 times, then falls back to a hand-written list (`src/lib/backup-puzzles.ts`).
- **Storage**: puzzles are stored in Upstash Redis keyed by date, so everyone gets the same one. Without Redis env vars it uses an in-memory store (fine for local dev).
- **Serving**: `GET /api/puzzle?date=YYYY-MM-DD` returns the acronym, clue and an obfuscated answer. Only UTC yesterday/today/tomorrow are served (covering every timezone), so players can't fetch future puzzles.
- **Checking guesses** happens in the browser in plain code (`src/lib/scoring.ts`), with no API call per guess. The answer is obfuscated, not encrypted: someone determined could decode it.
- **Cron**: `vercel.json` runs `/api/cron` daily at 00:05 UTC to create today's and the next two days' puzzles ahead of time.
- **Player data** (progress, stats, streaks, theme) lives in `localStorage`. No accounts.

## Local development

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. Without an API key the game still runs, using the backup puzzles.

To generate the next few days' puzzles by hand:

```bash
curl http://localhost:3000/api/cron
```

(If `CRON_SECRET` is set, add `-H "Authorization: Bearer $CRON_SECRET"`.)

```bash
npm test        # game logic unit tests
npm run lint
npm run build
```

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. In the project, open **Storage → Marketplace → Upstash (Redis)** and connect a database. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Add `ANTHROPIC_API_KEY` and `CRON_SECRET` under **Settings → Environment Variables**.
4. Deploy. The cron in `vercel.json` is picked up automatically.

## Project layout

```
src/app/api/puzzle   serves a day's puzzle (generates it on a cache miss, under a lock)
src/app/api/cron     pre-generates upcoming puzzles
src/lib/             game rules, scoring, dates, generation, storage
src/components/      Game, Board, AcronymBanner, Header, Help/Stats modals
```
