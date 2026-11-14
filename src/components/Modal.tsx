"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons";

export default function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 grid animate-fade-in place-items-center bg-backdrop p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-md animate-rise-in overflow-y-auto rounded-xl border border-line bg-bg p-6 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg"
        >
          <CloseIcon />
        </button>
        <h2 className="mb-4 text-center text-sm font-bold tracking-[0.14em] uppercase">{title}</h2>
        {children}
      </div>
    </div>
  );
}
