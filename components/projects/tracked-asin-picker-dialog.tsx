'use client';

import { TrackedAsinRole } from "@prisma/client";
import { formatDateTime } from "@/lib/date-time";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type TrackedAsinPickerDialogProps = {
  projectId: string;
  selectedAsinId: string;
  items: Array<{
    id: string;
    asin: string;
    role: TrackedAsinRole;
    title: string | null;
    capturedAt: Date | string | null;
  }>;
};

function roleLabel(role: TrackedAsinRole) {
  return role === TrackedAsinRole.OWN ? "Own" : "Competitor";
}

export function TrackedAsinPickerDialog({
  projectId,
  selectedAsinId,
  items
}: TrackedAsinPickerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.id === selectedAsinId) ?? items[0];
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === TrackedAsinRole.OWN ? -1 : 1;
        }
        return a.asin.localeCompare(b.asin);
      }),
    [items]
  );

  function handleSelect(nextAsinId: string) {
    setOpen(false);
    router.push(`/projects/${projectId}/trends?asinId=${nextAsinId}`);
  }

  if (!selected) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] px-5 py-4 text-left transition hover:border-[var(--md-primary)]/60 hover:bg-[var(--md-surface-container-highest)]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">{selected.asin}</span>
            {selected.capturedAt ? (
              <span className="font-label text-sm font-normal text-[var(--md-on-surface-variant)]">
                Captured {formatDateTime(selected.capturedAt)}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                selected.role === TrackedAsinRole.OWN
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-sky-500/15 text-sky-400"
              }`}
            >
              {roleLabel(selected.role)}
            </span>
          </div>
          <p className="mt-2 truncate font-label text-sm text-[var(--md-on-surface-variant)]">
            {selected.title ?? "No title synced yet"}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-[var(--md-outline-variant)] px-3 py-2 text-sm text-[var(--md-on-surface-variant)]">
          切换 ASIN
        </div>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] px-6 py-5">
              <div>
                <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">切换监控 ASIN</h2>
                <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">只显示当前项目内已监控的 ASIN。</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[var(--md-outline-variant)] px-3 py-2 text-sm text-[var(--md-on-surface-variant)] transition hover:border-[var(--md-primary)] hover:text-[var(--md-on-surface)]"
              >
                关闭
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="space-y-3">
                {sortedItems.map((item) => {
                  const active = item.id === selectedAsinId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`flex w-full items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                        active
                          ? "border-[var(--md-primary)] bg-[var(--md-primary)]/8"
                          : "border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] hover:border-[var(--md-primary)]/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">{item.asin}</span>
                          {item.capturedAt ? (
                            <span className="font-label text-sm font-normal text-[var(--md-on-surface-variant)]">
                              Captured {formatDateTime(item.capturedAt)}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.role === TrackedAsinRole.OWN
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-sky-500/15 text-sky-400"
                            }`}
                          >
                            {roleLabel(item.role)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 font-label text-sm text-[var(--md-on-surface-variant)]">
                          {item.title ?? "No title synced yet"}
                        </p>
                      </div>
                      {active ? (
                        <span className="shrink-0 rounded-xl bg-[var(--md-primary)] px-3 py-2 text-xs font-semibold text-[var(--md-on-primary)]">
                          当前
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
