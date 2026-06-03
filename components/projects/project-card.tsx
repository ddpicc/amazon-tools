type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    marketplace: string;
    monitoredDays: number;
    _count: {
      trackedAsins: number;
      alerts: number;
    };
    counts?: {
      ownAsins: number;
      competitorAsins: number;
    };
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <a
      href={`/projects/${project.id}`}
      className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] p-6 transition hover:border-[var(--md-primary)]/40 hover:bg-[var(--md-surface-container-highest)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-label text-sm uppercase tracking-[0.25em] text-[var(--md-on-surface-variant)]">{project.marketplace}</p>
          <h2 className="font-headline mt-2 text-xl font-semibold text-[var(--md-on-surface)]">{project.name}</h2>
        </div>
        <span className="rounded-full bg-[var(--md-primary)]/15 px-3 py-1 font-label text-sm text-[var(--md-primary)]">
          {project._count.trackedAsins} ASIN
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 font-label text-sm text-[var(--md-on-surface-variant)]">
        <div className="rounded-xl bg-[var(--md-surface-container-lowest)] p-4">
          <p>Own / Competitor</p>
          <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">
            {project.counts?.ownAsins ?? 0} / {project.counts?.competitorAsins ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--md-surface-container-lowest)] p-4">
          <p>监测天数</p>
          <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">{project.monitoredDays}</p>
        </div>
      </div>
    </a>
  );
}
