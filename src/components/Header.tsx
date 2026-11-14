"use client";

import { useSyncExternalStore } from "react";
import { saveThemePref } from "@/lib/storage";
import { HelpIcon, MoonIcon, StatsIcon, SunIcon } from "./Icons";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

const iconButton =
  "grid h-10 w-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-correct";

export default function Header({ onHelp, onStats }: { onHelp: () => void; onStats: () => void }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggleTheme() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    saveThemePref(next ? "dark" : "light");
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-3">
        <div>
          <button type="button" className={iconButton} onClick={onHelp} aria-label="How to play">
            <HelpIcon />
          </button>
        </div>
        <h1 className="font-display text-[1.75rem] font-black tracking-tight">Acronyle</h1>
        <div className="flex justify-end gap-1">
          <button type="button" className={iconButton} onClick={onStats} aria-label="Statistics">
            <StatsIcon />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
