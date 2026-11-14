export default function AcronymBanner({
  acronym,
  solved,
  number,
  theme,
  clue,
}: {
  acronym: string;
  solved: boolean[];
  number: number;
  theme: string;
  clue: string;
}) {
  // Shrink letters for long acronyms so they stay on one line on phones.
  const size = `min(2.75rem, calc((100vw - 2rem) / ${Math.max(acronym.length, 6) * 0.82}))`;
  return (
    <section className="flex flex-col items-center gap-3 pt-6 pb-5 text-center">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
        No. {number} · {theme}
      </p>
      <div
        className="flex justify-center font-display font-black leading-none"
        style={{ fontSize: size }}
        aria-label={`Acronym: ${acronym.split("").join(" ")}`}
      >
        {acronym.split("").map((letter, i) => (
          <span
            key={i}
            className={`px-[0.06em] transition-colors duration-500 ${solved[i] ? "text-correct" : ""}`}
          >
            {letter}
          </span>
        ))}
      </div>
      <p className="max-w-md text-[0.95rem] text-muted italic">“{clue}”</p>
    </section>
  );
}
