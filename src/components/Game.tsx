"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localDateKey } from "@/lib/dates";
import { normalizeWord, splitPhrase } from "@/lib/normalize";
import { decodeAnswer } from "@/lib/obfuscate";
import type { PublicPuzzle } from "@/lib/puzzles";
import { validateGuess } from "@/lib/rules";
import { isSolved, scoreGuess } from "@/lib/scoring";
import {
  EMPTY_STATS,
  hasSeenHelp,
  loadGame,
  loadStats,
  markHelpSeen,
  recordResult,
  saveGame,
  type SavedGame,
  type Stats,
} from "@/lib/storage";
import AcronymBanner from "./AcronymBanner";
import Board, { type BoardHandle } from "./Board";
import Countdown from "./Countdown";
import Header from "./Header";
import HelpModal from "./HelpModal";
import StatsModal from "./StatsModal";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; puzzle: PublicPuzzle; answer: string[]; phrase: string };

const WIN_WORDS = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Nice!", "Solid!", "Got it!", "Close one!", "Phew!"];
const FLIP_MS = 110;
const FLIP_DURATION = 380;
const HINT_AFTER = 3;

function lockedWords(answer: string[], marks: SavedGame["marks"]): (string | null)[] {
  return answer.map((word, i) => (marks.some((row) => row[i] === "correct") ? word : null));
}

export default function Game() {
  const [date, setDate] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [game, setGame] = useState<SavedGame | null>(null);
  const [inputs, setInputs] = useState<string[]>([]);
  const [revealRow, setRevealRow] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [reloadKey, setReloadKey] = useState(0);
  const board = useRef<BoardHandle>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const showToast = useCallback(
    (text: string, ms = 1800) => {
      const id = Date.now();
      setToast({ text, id });
      later(() => setToast((t) => (t?.id === id ? null : t)), ms);
    },
    [later],
  );

  // Pick the player's local date, and roll over if the tab stays open past midnight.
  useEffect(() => {
    const sync = () => setDate((d) => (d === localDateKey() ? d : localDateKey()));
    sync();
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // Fetch the puzzle for that date and restore any saved progress.
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/puzzle?date=${date}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Couldn't load the puzzle.");
        if (cancelled) return;
        const puzzle = body as PublicPuzzle;
        const phrase = decodeAnswer(puzzle.answer, puzzle.date);
        const answer = splitPhrase(phrase);
        const saved = loadGame(puzzle.date) ?? { date: puzzle.date, guesses: [], marks: [], status: "playing" as const };
        setLoad({ state: "ready", puzzle, answer, phrase });
        setGame(saved);
        setInputs(answer.map(() => ""));
        setRevealRow(null);
        setCelebrate(false);
        setStats(loadStats());
        if (!hasSeenHelp()) {
          setHelpOpen(true);
          markHelpSeen();
        }
      } catch (err) {
        if (!cancelled) setLoad({ state: "error", message: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, reloadKey]);

  const ready = load.state === "ready" ? load : null;
  const locked = useMemo(
    () => (ready && game ? lockedWords(ready.answer, game.marks) : []),
    [ready, game],
  );

  // Put the cursor in the first open box whenever a new row becomes active.
  const rowCount = game?.guesses.length ?? 0;
  useEffect(() => {
    if (ready && game?.status === "playing" && !revealing && !helpOpen) board.current?.focusFirstOpen();
  }, [ready, game?.status, rowCount, revealing, helpOpen]);

  function handleInput(i: number, value: string) {
    setInputs((prev) => {
      const next = [...prev];
      next[i] = value.replace(/\s/g, "").slice(0, 20);
      return next;
    });
  }

  function submit() {
    if (!ready || !game || game.status !== "playing" || revealing) return;
    const { puzzle, answer } = ready;
    const guess = answer.map((_, i) => locked[i] ?? inputs[i] ?? "");
    const error = validateGuess(guess, puzzle.acronym, game.guesses);
    if (error) {
      showToast(error);
      setShaking(true);
      return;
    }

    const marks = scoreGuess(guess, answer);
    const guesses = [...game.guesses, guess.map(normalizeWord)];
    const won = isSolved(marks);
    const status = won ? "won" : guesses.length >= puzzle.maxGuesses ? "lost" : "playing";
    const next: SavedGame = { ...game, guesses, marks: [...game.marks, marks], status };
    saveGame(next);
    setGame(next);
    setInputs(answer.map(() => ""));
    setRevealRow(guesses.length - 1);
    setRevealing(true);

    const revealDone = (answer.length - 1) * FLIP_MS + FLIP_DURATION;
    later(() => {
      setRevealing(false);
      if (status === "playing") return;
      setStats(recordResult(puzzle.date, won, guesses.length));
      if (won) {
        setCelebrate(true);
        showToast(WIN_WORDS[Math.min(guesses.length, WIN_WORDS.length) - 1], 2200);
      }
      later(() => setStatsOpen(true), won ? 1900 : 1400);
    }, revealDone);
  }

  const status = game?.status ?? "playing";
  const finished = status !== "playing";
  const wonIn = status === "won" ? game?.guesses.length ?? null : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        onHelp={() => setHelpOpen(true)}
        onStats={() => {
          setStats(loadStats());
          setStatsOpen(true);
        }}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        {load.state === "loading" && <LoadingState />}

        {load.state === "error" && (
          <div className="mt-24 flex flex-col items-center gap-4 text-center">
            <p className="text-muted">{load.message}</p>
            <button
              type="button"
              className="rounded-full bg-fg px-5 py-2 font-semibold text-bg"
              onClick={() => {
                setLoad({ state: "loading" });
                setReloadKey((k) => k + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}

        {ready && game && (
          <>
            <AcronymBanner
              key={ready.puzzle.date}
              acronym={ready.puzzle.acronym}
              // While a row is flipping, hold back its new greens so the banner lights up afterwards.
              solved={lockedWords(ready.answer, revealing ? game.marks.slice(0, -1) : game.marks).map((w) => w !== null)}
              number={ready.puzzle.number}
              theme={ready.puzzle.theme}
              clue={ready.puzzle.clue}
              // Count a row only once its flip finishes; always show the hint once the game is over.
              guessesUntilHint={
                finished && !revealing ? 0 : Math.max(0, HINT_AFTER - (game.guesses.length - (revealing ? 1 : 0)))
              }
            />

            <Board
              ref={board}
              acronym={ready.puzzle.acronym}
              guesses={game.guesses}
              marks={game.marks}
              revealRow={revealRow}
              celebrate={celebrate}
              playing={status === "playing" && !revealing}
              inputs={inputs}
              locked={locked}
              shaking={shaking}
              onShakeEnd={() => setShaking(false)}
              maxGuesses={ready.puzzle.maxGuesses}
              onInput={handleInput}
              onSubmit={submit}
            />

            {status === "playing" && !revealing && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={submit}
                  className="rounded-full bg-fg px-7 py-2.5 font-semibold text-bg transition-transform active:scale-95"
                >
                  Submit guess
                </button>
              </div>
            )}

            {finished && !revealing && (
              <section className="mt-8 animate-rise-in rounded-xl border border-line bg-surface p-5 text-center">
                <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">
                  {status === "won" ? `Solved in ${game.guesses.length}/${ready.puzzle.maxGuesses}` : "The phrase was"}
                </p>
                <p className="mt-2 font-display text-2xl leading-snug font-bold">“{ready.phrase}”</p>
                <div className="mt-5 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Next puzzle in</span>
                  <Countdown />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStats(loadStats());
                    setStatsOpen(true);
                  }}
                  className="mt-4 rounded-full border border-line-strong px-5 py-2 text-sm font-semibold hover:bg-bg"
                >
                  View stats
                </button>
              </section>
            )}
          </>
        )}
      </main>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-none fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-md bg-fg px-4 py-2.5 text-sm font-bold text-bg shadow-lg"
        >
          {toast.text}
        </div>
      )}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {date && (
        <StatsModal
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          stats={stats}
          today={date}
          maxGuesses={ready?.puzzle.maxGuesses ?? 6}
          highlight={wonIn}
          finished={finished}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-16 flex flex-col items-center gap-5" aria-busy="true">
      <div className="flex gap-1.5">
        {"ACRONYLE".split("").map((l, i) => (
          <span
            key={i}
            className="grid h-10 w-9 animate-pulse place-items-center rounded-md border-2 border-line font-display text-lg font-black text-line-strong"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {l}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">Fetching today&apos;s puzzle…</p>
    </div>
  );
}
