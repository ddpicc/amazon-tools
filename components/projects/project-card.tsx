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
    latestSuccessAt: Date | null;
    failedAsinCount: number;
    staleAsinCount: number;
    attentionCount: number;
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-label text-sm uppercase tracking-[0.25em] text-[var(--md-on-surface-variant)]">{project.marketplace}</p>
          <h2 className="font-headline mt-2 text-xl font-semibold text-[var(--md-on-surface)]">{project.name}</h2>
        </div>
        {project.attentionCount ? (
          <span className="rounded-md bg-amber-500/10 px-3 py-1 font-label text-xs font-semibold text-amber-300">
            {project.attentionCount} 项待处理
          </span>
        ) : (
          <span className="rounded-md bg-emerald-500/10 px-3 py-1 font-label text-xs font-semibold text-emerald-300">
            状态正常
          </span>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 font-label text-sm text-[var(--md-on-surface-variant)]">
        <div className="rounded-xl bg-[var(--md-surface-container-lowest)] p-4">
          <p>自有商品 / 竞品</p>
          <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">
            {project.counts?.ownAsins ?? 0} / {project.counts?.competitorAsins ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--md-surface-container-lowest)] p-4">
          <p>活跃监控</p>
          <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">{project._count.trackedAsins}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-[var(--md-outline-variant)] pt-4 font-label text-xs text-[var(--md-on-surface-variant)]">
        <div className="flex items-center justify-between gap-3">
          <span>最近成功采集</span>
          <span className="text-right text-[var(--md-on-surface)]">
            {project.latestSuccessAt ? new Date(project.latestSuccessAt).toLocaleString("zh-CN") : "尚未成功采集"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>监控天数</span>
          <span className="text-[var(--md-on-surface)]">{project.monitoredDays} 天</span>
        </div>
        {project.failedAsinCount || project.staleAsinCount ? (
          <p className="mt-2 text-amber-300">
            {project.failedAsinCount ? `${project.failedAsinCount} 个采集失败` : ""}
            {project.failedAsinCount && project.staleAsinCount ? " · " : ""}
            {project.staleAsinCount ? `${project.staleAsinCount} 个数据待检查` : ""}
          </p>
        ) : null}
      </div>
    </a>
  );
}
