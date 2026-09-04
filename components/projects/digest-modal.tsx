"use client";

import { useEffect, useState } from "react";
import { sanitizeDigestText } from "@/lib/digest-display";

export function DigestModal({ dateLabel, summary }: { dateLabel: string; summary: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex cursor-pointer font-label text-sm font-semibold text-[var(--md-primary)] transition-colors hover:text-[var(--md-primary-dim)]"
      >
        查看完整日报
      </button>

      {open ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="digest-modal-title"
            className="max-h-[min(760px,calc(100vh-2rem))] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--md-outline-variant)] px-5 py-4 sm:px-6">
              <div>
                <p className="font-label text-xs text-[var(--md-on-surface-variant)]">项目日报</p>
                <h2 id="digest-modal-title" className="mt-1 font-headline text-xl font-semibold text-[var(--md-on-surface)]">
                  {dateLabel}
                </h2>
              </div>
              <button
                type="button"
                aria-label="关闭日报弹窗"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-2xl leading-none text-[var(--md-on-surface-variant)] transition-colors hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-5 py-5 sm:px-6">
              <pre className="whitespace-pre-wrap font-label text-sm leading-7 text-[var(--md-on-surface-variant)]">
                {sanitizeDigestText(summary)}
              </pre>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
