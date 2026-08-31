import Link from "next/link";
import { auth } from "@/auth";
import { getHomeDashboard, type HomeDashboardAction } from "@/server/services/home-dashboard";
import { getBillingSummary } from "@/server/services/billing/get-billing-summary";
import { redirect } from "next/navigation";

function formatDateTime(value: Date | null) {
  return value ? value.toLocaleString("zh-CN") : "尚未成功采集";
}

function actionTone(severity: HomeDashboardAction["severity"]) {
  if (severity === "CRITICAL") {
    return "border-[var(--md-error)]/30 bg-[var(--md-error)]/8 text-[var(--md-error)]";
  }

  if (severity === "WARNING") {
    return "border-amber-500/30 bg-amber-500/8 text-amber-300";
  }

  return "border-sky-500/30 bg-sky-500/8 text-sky-300";
}

function actionLabel(kind: HomeDashboardAction["kind"]) {
  switch (kind) {
    case "ALERT":
      return "告警";
    case "SYNC_FAILURE":
      return "采集失败";
    case "STALE_DATA":
      return "数据状态";
    case "REVIEW":
      return "用户声音";
    case "DELIVERY_FAILURE":
      return "投递失败";
    case "DIGEST_FAILURE":
      return "日报状态";
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role === "ADMIN") redirect("/admin");

  const [dashboard, billing] = await Promise.all([
    getHomeDashboard(session.user.id),
    getBillingSummary(session.user.id)
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Amazon intelligence workspace</p>
          <h1 className="mt-3 font-headline text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">工作台</h1>
          <p className="mt-2 max-w-2xl font-label text-sm leading-6 text-[var(--md-on-surface-variant)]">
            先处理需要关注的商品变化，再进入项目查看监控、评论和日报记录。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--md-outline-variant)] px-4 py-2.5 font-label text-sm font-semibold text-[var(--md-on-surface)] transition hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            查看项目
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--md-primary)] px-4 py-2.5 font-label text-sm font-semibold text-[var(--md-on-primary)] transition hover:bg-[var(--md-primary-dim)]"
          >
            新建项目
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="活跃项目" value={String(dashboard.portfolio.projectCount)} detail="持续观察中的商品工作区" />
        <Metric label="活跃商品" value={String(dashboard.portfolio.activeAsinCount)} detail="当前启用的自有商品和竞品" />
        <Metric
          label="数据新鲜度"
          value={`${dashboard.portfolio.freshnessPercent}%`}
          detail={`${dashboard.portfolio.freshAsinCount} 个正常 · ${dashboard.portfolio.staleAsinCount} 个待检查`}
        />
        <Metric label="需要处理" value={String(dashboard.portfolio.attentionCount)} detail="按失败、过期和新增反馈排序" />
      </section>

      <section className="border-y border-[var(--md-outline-variant)] py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">需要关注</h2>
            <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">仅展示已保存在本地的监控和通知事实，不在此页面触发外部采集。</p>
          </div>
          <span className="font-label text-sm text-[var(--md-on-surface-variant)]">{dashboard.actions.length} 项</span>
        </div>

        {dashboard.actions.length ? (
          <div className="mt-5 divide-y divide-[var(--md-outline-variant)]">
            {dashboard.actions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="flex flex-col gap-3 py-4 transition hover:bg-[var(--md-surface-container)] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 rounded-md border px-2 py-1 font-label text-[11px] font-semibold ${actionTone(action.severity)}`}>
                    {actionLabel(action.kind)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-headline text-sm font-semibold text-[var(--md-on-surface)]">{action.title}</p>
                    <p className="mt-1 line-clamp-2 font-label text-sm text-[var(--md-on-surface-variant)]">{action.detail}</p>
                    <p className="mt-2 font-label text-xs text-[var(--md-outline)]">
                      {action.marketplace} · {action.projectName}{action.asin ? ` · ${action.asin}` : ""}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="font-label text-xs text-[var(--md-outline)]">{action.occurredAt.toLocaleString("zh-CN")}</p>
                  <p className="mt-1 font-label text-sm font-semibold text-[var(--md-primary)]">查看详情</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 border border-dashed border-[var(--md-outline-variant)] px-5 py-6 font-label text-sm text-[var(--md-on-surface-variant)]">
            当前没有需要处理的本地记录。创建项目并完成首次采集后，这里会汇总同步、通知和用户反馈状态。
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">我的项目</h2>
            <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">按项目查看最近成功采集、待关注对象和进入入口。</p>
          </div>
          <Link href="/projects" className="font-label text-sm font-semibold text-[var(--md-primary)]">查看我的项目</Link>
        </div>

        {dashboard.projects.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {dashboard.projects.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] p-5 transition hover:border-[var(--md-primary)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-label text-xs text-[var(--md-on-surface-variant)]">{project.marketplace}</p>
                    <h3 className="mt-1 truncate font-headline text-lg font-semibold text-[var(--md-on-surface)]">{project.name}</h3>
                  </div>
                  {project.attentionCount ? (
                    <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-1 font-label text-xs font-semibold text-amber-300">
                      {project.attentionCount} 项待处理
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 font-label text-sm text-[var(--md-on-surface-variant)]">
                  {project.ownAsinCount} 个自有商品 · {project.competitorAsinCount} 个竞品
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--md-outline-variant)] pt-4 text-sm">
                  <div>
                    <dt className="font-label text-xs text-[var(--md-outline)]">最近成功采集</dt>
                    <dd className="mt-1 font-label text-[var(--md-on-surface)]">{formatDateTime(project.latestSuccessAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-label text-xs text-[var(--md-outline)]">数据状态</dt>
                    <dd className="mt-1 font-label text-[var(--md-on-surface)]">
                      {project.failedAsinCount ? `${project.failedAsinCount} 个失败` : project.staleAsinCount ? `${project.staleAsinCount} 个待检查` : "正常"}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 border border-dashed border-[var(--md-outline-variant)] px-5 py-6">
            <p className="font-label text-sm text-[var(--md-on-surface-variant)]">还没有项目。先创建一个商品情报项目，添加自有商品和竞品后即可开始监控。</p>
            <Link href="/projects/new" className="mt-4 inline-flex font-label text-sm font-semibold text-[var(--md-primary)]">新建第一个项目</Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-[var(--md-outline-variant)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-label text-sm font-semibold text-[var(--md-on-surface)]">账户状态</p>
          <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">
            {billing.entitlements.plan.displayName} · {billing.entitlements.usage.projectCount} / {billing.entitlements.limits.maxProjects} 个项目 · {billing.entitlements.usage.activeTrackedAsinCount} / {billing.entitlements.limits.maxTrackedAsins} 个活跃 ASIN
          </p>
        </div>
        <Link href="/billing" className="font-label text-sm font-semibold text-[var(--md-primary)]">套餐与用量</Link>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] p-5">
      <p className="font-label text-sm text-[var(--md-on-surface-variant)]">{label}</p>
      <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">{value}</p>
      <p className="mt-2 font-label text-xs text-[var(--md-on-surface-variant)]">{detail}</p>
    </div>
  );
}
