import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Reusable surface primitives matching the Material You token palette
 * --------------------------------------------------------------------------- */

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "high" | "highest";
};

export function Surface({ children, className, tone = "default" }: SurfaceProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--md-outline-variant)] p-6",
        tone === "default" && "bg-[var(--md-surface-container-high)]",
        tone === "high" && "bg-[var(--md-surface-container-highest)]",
        tone === "highest" && "bg-[var(--md-surface-container-highest)]",
        className
      )}
    >
      {children}
    </section>
  );
}

type MetricCardProps = {
  label: string;
  ownValue: string | number;
  ownLabel?: string;
  compValue?: string | number;
  compLabel?: string;
  footer?: ReactNode;
};

export function MetricCard({ label, ownValue, ownLabel = "Own", compValue, compLabel = "Comp", footer }: MetricCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] p-6">
      <span className="font-label text-sm text-[var(--md-on-surface-variant)]">{label}</span>
      <div className="mt-4 flex flex-1 flex-col justify-end">
        <div className="flex items-end gap-3">
          <span className="font-headline text-3xl font-bold text-[var(--md-primary)]">{ownValue}</span>
          {ownLabel ? <span className="mb-1 font-label text-sm text-[var(--md-on-surface-variant)]">{ownLabel}</span> : null}
        </div>
        {compValue !== undefined ? (
          <div className="mt-2 flex items-end gap-3">
            <span className="font-headline text-xl font-medium text-[var(--md-secondary)]">{compValue}</span>
            <span className="mb-1 font-label text-xs text-[var(--md-on-surface-variant)]">{compLabel}</span>
          </div>
        ) : null}
      </div>
      {footer ? (
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--md-outline-variant)]/30 pt-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type SectionHeadingProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">{title}</h3>
        {description ? <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
