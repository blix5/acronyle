import Modal from "./Modal";
import type { Mark } from "@/lib/scoring";

const EXAMPLE: { word: string; mark: Mark }[] = [
  { word: "i", mark: "correct" },
  { word: "dont", mark: "correct" },
  { word: "ever", mark: "absent" },
  { word: "care", mark: "correct" },
  { word: "if", mark: "correct" },
  { word: "you", mark: "correct" },
  { word: "do", mark: "absent" },
  { word: "though", mark: "present" },
  { word: "that", mark: "present" },
];

const tone: Record<Mark, string> = {
  correct: "bg-correct",
  present: "bg-present",
  absent: "bg-absent",
};

export default function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="How to play" open={open} onClose={onClose}>
      <div className="space-y-4 text-[0.95rem] leading-relaxed">
        <p>
          Each day there&apos;s a hidden phrase. You only see the <strong>first letter of every word</strong>. Guess
          every word to solve it.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Type one word per box. Space or Tab jumps to the next box, Enter submits.</li>
          <li>Each word must start with its letter. Capitals and punctuation don&apos;t matter: “dont” = “don&apos;t”.</li>
          <li>Longer acronyms get more guesses.</li>
          <li>Stuck? A hint unlocks after your third guess.</li>
        </ul>
        <div>
          <p className="mb-2 font-semibold">Example: IDECIYDTT</p>
          <div className="flex flex-wrap gap-1">
            {EXAMPLE.map((t, i) => (
              <span key={i} className={`${tone[t.mark]} rounded px-2 py-1 text-sm font-semibold text-on-color`}>
                {t.word}
              </span>
            ))}
          </div>
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-4 w-4 shrink-0 rounded bg-correct" /> Green: right word, right spot. It stays locked
            in for your next guess.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-4 w-4 shrink-0 rounded bg-present" /> Yellow: that word is in the phrase, but in a
            different spot.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-4 w-4 shrink-0 rounded bg-absent" /> Gray: that word isn&apos;t in the phrase.
          </li>
        </ul>
        <p className="border-t border-line pt-3 text-sm text-muted">
          The answer above was “I don&apos;t even care if you did that though”. A new puzzle arrives every day at
          midnight.
        </p>
      </div>
    </Modal>
  );
}
