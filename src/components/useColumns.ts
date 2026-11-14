"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * How many word tiles per line: as many as fit, balanced so lines are
 * roughly even (16 words in 7 columns would leave a lonely last line).
 */
export function useColumns(ref: RefObject<HTMLElement | null>, count: number, minTile = 78) {
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  const maxCols = Math.max(2, Math.floor((width + 6) / (minTile + 6)));
  const lines = Math.ceil(count / maxCols);
  return Math.ceil(count / lines);
}
