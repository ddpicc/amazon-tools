import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  Columns3,
  FolderKanban,
  Newspaper,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectWorkspaceTab = "overview" | "compare" | "trends" | "asins" | "digest" | "settings";

type ProjectWorkspaceShellProps = {
  project: {
    id: string;
    name: string;
    marketplace: string;
  };
  currentTab: ProjectWorkspaceTab;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

const tabItems: Array<{
  key: ProjectWorkspaceTab;
  label: string;
  icon: ReactNode;
  href: (projectId: string) => string;
}> = [
  {
    key: "overview",
    label: "Overview",
    icon: <FolderKanban className="h-[18px] w-[18px]" />,
    href: (id) => `/projects/${id}`
  },
  {
    key: "compare",
    label: "Compare",
    icon: <Columns3 className="h-[18px] w-[18px]" />,
    href: (id) => `/projects/${id}/compare`
  },
  {
    key: "trends",
    label: "Snapshots",
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
    href: (id) => `/projects/${id}/trends`
  },
  {
    key: "asins",
    label: "ASINs",
    icon: <Boxes className="h-[18px] w-[18px]" />,
    href: (id) => `/projects/${id}/asins`
  },
  {
    key: "digest",
    label: "Digest",
    icon: <Newspaper className="h-[18px] w-[18px]" />,
    href: (id) => `/projects/${id}/digest`
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings2 className="h-[18px] w-[18px]" />,
    href: (id) => `/projects/${id}/settings`
  }
];

export function ProjectWorkspaceShell({
  project,
  currentTab,
  eyebrow,
  title,
  description,
  actions,
  children
}: ProjectWorkspaceShellProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[var(--md-surface)]">
      {/* TopAppBar — per user request no Overview/Intelligence/Trends inner tabs */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)]/80 px-8 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link
            href="/projects"
            className="font-headline text-xl font-black tracking-tight text-[var(--md-primary)]"
          >
            Sellumio
          </Link>
          {/* breadcrumb */}
          <div className="hidden items-center gap-2 font-label text-sm text-[var(--md-on-surface-variant)] lg:flex">
            <span>Projects</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[var(--md-primary)]">{project.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-[var(--md-surface-container)] px-3 py-1.5 font-label text-xs text-[var(--md-on-surface-variant)]">
            {project.marketplace}
          </span>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] px-8 py-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">{eyebrow}</p>
                <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">{title}</h1>
                <p className="mt-2 max-w-2xl font-label text-sm text-[var(--md-on-surface-variant)]">{description}</p>
              </div>
              {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
            </div>
            {/* Tab bar */}
            <nav className="mt-6 flex gap-1 border-b border-[var(--md-outline-variant)]">
              {tabItems.map((item) => {
                const active = item.key === currentTab;
                return (
                  <Link
                    key={item.key}
                    href={item.href(project.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 border-b-2 px-4 pb-3 pt-1 font-label text-sm font-medium transition-colors",
                      active
                        ? "border-[var(--md-primary)] text-[var(--md-primary)]"
                        : "border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </div>
    </div>
  );
}

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
