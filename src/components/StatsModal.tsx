import { liveStreak, type Stats } from "@/lib/storage";
import Countdown from "./Countdown";
import Modal from "./Modal";

export default function StatsModal({
  open,
  onClose,
  stats,
  today,
  maxGuesses,
  highlight,
  finished,
}: {
  open: boolean;
  onClose: () => void;
  stats: Stats;
  today: string;
  maxGuesses: number;
  /** Guess count of today's win, to highlight its bar. */
  highlight: number | null;
  finished: boolean;
}) {
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const rows = Math.max(maxGuesses, ...Object.keys(stats.distribution).map(Number), 1);
  const counts = Array.from({ length: rows }, (_, i) => stats.distribution[i + 1] ?? 0);
  const top = Math.max(...counts, 1);

  const figures = [
    { value: stats.played, label: "Played" },
    { value: winPct, label: "Win %" },
    { value: liveStreak(stats, today), label: "Current streak" },
    { value: stats.maxStreak, label: "Max streak" },
  ];

  return (
    <Modal title="Statistics" open={open} onClose={onClose}>
      <div className="grid grid-cols-4 gap-2 text-center">
        {figures.map((f) => (
          <div key={f.label}>
            <div className="text-3xl font-semibold tabular-nums">{f.value}</div>
            <div className="text-[0.7rem] leading-tight text-muted">{f.label}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 mb-2 text-center text-sm font-bold tracking-[0.14em] uppercase">Guess distribution</h3>
      {stats.wins === 0 ? (
        <p className="text-center text-sm text-muted">No wins yet. Your first one will show up here.</p>
      ) : (
        <div className="space-y-1">
          {counts.map((count, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-right tabular-nums">{i + 1}</span>
              <div className="flex-1">
                <div
                  className={`flex min-w-7 justify-end rounded-sm px-2 py-0.5 font-semibold text-on-color tabular-nums ${
                    highlight === i + 1 ? "bg-correct" : "bg-absent"
                  }`}
                  style={{ width: `${Math.max(7, (count / top) * 100)}%` }}
                >
                  {count}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {finished && (
        <div className="mt-6 border-t border-line pt-4 text-center">
          <div className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Next puzzle in</div>
          <Countdown />
        </div>
      )}
    </Modal>
  );
}
