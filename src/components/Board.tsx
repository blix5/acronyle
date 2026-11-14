"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Mark } from "@/lib/scoring";
import { useColumns } from "./useColumns";

const tone: Record<Mark, string> = {
  correct: "bg-correct border-correct",
  present: "bg-present border-present",
  absent: "bg-absent border-absent",
};

const markLabel: Record<Mark, string> = { correct: "correct", present: "in another spot", absent: "not in phrase" };

export interface BoardHandle {
  focusFirstOpen: () => void;
}

interface Props {
  acronym: string;
  guesses: string[][];
  marks: Mark[][];
  /** Index of the row that should play its flip animation, if any. */
  revealRow: number | null;
  /** Bounce the last row (win celebration). */
  celebrate: boolean;
  playing: boolean;
  inputs: string[];
  locked: (string | null)[];
  shaking: boolean;
  onShakeEnd: () => void;
  maxGuesses: number;
  onInput: (index: number, value: string) => void;
  onSubmit: () => void;
}

const Board = forwardRef<BoardHandle, Props>(function Board(
  { acronym, guesses, marks, revealRow, celebrate, playing, inputs, locked, shaking, onShakeEnd, maxGuesses, onInput, onSubmit },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cols = useColumns(container, acronym.length);
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  const letters = acronym.split("");

  const open = (i: number) => locked[i] === null;
  const nextOpen = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < letters.length; i += dir) if (open(i)) return i;
    return null;
  };
  const focus = (i: number | null, caret: "start" | "end" = "end") => {
    if (i === null) return;
    const el = inputRefs.current[i];
    if (!el) return;
    el.focus();
    const pos = caret === "end" ? el.value.length : 0;
    el.setSelectionRange(pos, pos);
  };

  useImperativeHandle(ref, () => ({
    focusFirstOpen: () => focus(open(0) ? 0 : nextOpen(0, 1)),
  }));

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (e.key === " ") {
      e.preventDefault();
      focus(nextOpen(i, 1));
    } else if (e.key === "Backspace" && el.value === "") {
      e.preventDefault();
      focus(nextOpen(i, -1));
    } else if (e.key === "ArrowLeft" && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      focus(nextOpen(i, -1));
    } else if (e.key === "ArrowRight" && el.selectionStart === el.value.length) {
      e.preventDefault();
      focus(nextOpen(i, 1), "start");
    }
  }

  function handleChange(i: number, raw: string) {
    // Typing or pasting several words spills them into the following open boxes.
    const parts = raw.split(/\s+/);
    onInput(i, parts[0]);
    let slot: number | null = i;
    for (const part of parts.slice(1)) {
      slot = nextOpen(slot, 1);
      if (slot === null) break;
      if (part) onInput(slot, part);
    }
    if (parts.length > 1) focus(slot ?? i);
  }

  const remaining = maxGuesses - guesses.length;

  return (
    <div ref={container} className={`flex flex-col ${cols < acronym.length ? "gap-5" : "gap-2.5"}`}>
      {guesses.map((row, r) => {
        const isReveal = r === revealRow;
        const isLast = r === guesses.length - 1;
        return (
          <div key={r} className="grid gap-1.5" style={gridStyle} aria-label={`Guess ${r + 1}`} role="group">
            {row.map((word, i) => (
              <div key={i} style={{ perspective: "600px" }}>
                <div
                  className={`${tone[marks[r][i]]} ${isReveal ? "animate-flip-in" : ""} ${
                    celebrate && isLast ? "animate-bounce-up" : ""
                  } flex h-10 items-center justify-center truncate rounded-md border-2 px-1 text-[0.95rem] font-semibold text-on-color`}
                  style={
                    isReveal || (celebrate && isLast)
                      ? { animationDelay: `${i * (celebrate && isLast ? 70 : 110)}ms` }
                      : undefined
                  }
                  title={word}
                >
                  <span className="truncate">{word}</span>
                  <span className="sr-only">, {markLabel[marks[r][i]]}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {playing && (
        <div
          className={`grid gap-1.5 ${shaking ? "animate-shake" : ""}`}
          style={gridStyle}
          onAnimationEnd={(e) => e.target === e.currentTarget && onShakeEnd()}
        >
          {letters.map((letter, i) =>
            locked[i] !== null ? (
              <div
                key={i}
                className="relative flex h-14 items-center justify-center truncate rounded-md border-2 border-correct bg-correct px-1 text-lg font-semibold text-on-color"
                aria-label={`Word ${i + 1}, locked: ${locked[i]}`}
              >
                <span className="absolute top-0.5 left-1.5 text-[0.65rem] font-bold opacity-80">{letter}</span>
                <span className="truncate">{locked[i]}</span>
              </div>
            ) : (
              <label
                key={i}
                className={`relative flex h-14 items-center rounded-md border-2 bg-bg transition-colors focus-within:border-fg ${
                  inputs[i] ? "animate-pop border-line-strong" : "border-line"
                }`}
              >
                <span className="pointer-events-none absolute top-0.5 left-1.5 text-[0.65rem] font-bold text-muted">
                  {letter}
                </span>
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  value={inputs[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKey(i, e)}
                  aria-label={`Word ${i + 1}, starts with ${letter}`}
                  placeholder={letter.toLowerCase()}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="h-full w-full min-w-0 bg-transparent px-1 pt-1.5 text-center text-lg font-semibold outline-none placeholder:text-line-strong/50"
                />
              </label>
            ),
          )}
        </div>
      )}

      {playing && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: maxGuesses }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i < guesses.length ? "bg-line-strong" : i === guesses.length ? "bg-fg" : "bg-line"}`}
              />
            ))}
          </div>
          <span className="text-sm text-muted">
            Guess {guesses.length + 1} of {maxGuesses}
            {remaining === 1 ? " · last chance" : ""}
          </span>
        </div>
      )}
    </div>
  );
});

export default Board;
