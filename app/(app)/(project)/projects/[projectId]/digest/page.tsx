import Link from "next/link";
import { auth } from "@/auth";
import { ProjectMonitoringHistory } from "@/components/projects/project-monitoring-history";
import { MetricCard, Surface } from "@/components/projects/project-workspace-shell";
import { db } from "@/server/db";
import { getProjectMonitoringHistory } from "@/server/services/project-monitoring-history";

function statusLabel(status: string) {
  if (status === "SUCCESS") return "Delivered";
  if (status === "FAILED") return "Failed";
  return status;
}

function statusBadge(status: string) {
  if (status === "SUCCESS") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  if (status === "FAILED") return "border-[var(--md-error)]/20 bg-[var(--md-error)]/10 text-[var(--md-error)]";
  return "border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]";
}

function channelLabel(t: string) {
  if (t === "FEISHU") return "飞书 (Feishu)";
  if (t === "WECOM") return "企业微信 (WeCom)";
  if (t === "EMAIL") return "邮件 (Email)";
  return t;
}

export default async function ProjectDigestPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: { id: true, name: true, marketplace: true }
  });
  if (!project) return null;

  const history = await getProjectMonitoringHistory(project.id, {
    pollJobLimit: 10,
    deliveryLimit: 18,
    suppressionLimit: 10,
    digestLimit: 12
  });

  const successRate = history.deliveryHealth.totalCount
    ? Math.round((history.deliveryHealth.successCount / history.deliveryHealth.totalCount) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Daily archive</p>
          <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">
            日报 (Daily Digest) Archive
          </h1>
          <p className="mt-2 max-w-2xl font-label text-sm text-[var(--md-on-surface-variant)]">
            Daily summaries of competitor movements, operational metrics, and automated alerts delivered to your team's channels.
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/settings`}
          className="flex w-fit items-center gap-2 rounded-lg bg-[var(--md-primary)] px-4 py-2 font-label text-sm font-semibold text-[var(--md-on-primary)] shadow-[0_0_15px_rgba(249,188,69,0.15)] transition hover:bg-[var(--md-primary-dim)]"
        >
          Delivery Settings
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Archive size" ownValue={history.dailyDigests.length} />
        <MetricCard label="Delivered" ownValue={history.dailyDigests.filter((d) => d.status === "SUCCESS").length} />
        <MetricCard label="Failed" ownValue={history.dailyDigests.filter((d) => d.status === "FAILED").length} />
        <MetricCard label="Delivery health" ownValue={`${successRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {history.dailyDigests.map((digest) => (
            <div key={digest.id} className="relative overflow-hidden rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-highest)] p-5 transition hover:border-[var(--md-outline-variant)]">
              <div className={`absolute left-0 top-0 h-full w-1 ${digest.status === "SUCCESS" ? "bg-emerald-500" : "bg-[var(--md-error)]"}`} />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">
                    {new Date(digest.digestDate).toLocaleDateString("zh-CN")}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider ${statusBadge(digest.status)}`}>
                    {statusLabel(digest.status)}
                  </span>
                </div>
                <span className="font-label text-xs text-[var(--md-on-surface-variant)]">
                  {digest.sentAt ? new Date(digest.sentAt).toLocaleString("zh-CN") : "未发送"}
                </span>
              </div>
              {digest.errorMessage ? <p className="mt-3 font-label text-sm text-[var(--md-error)]">{digest.errorMessage}</p> : null}
            </div>
          ))}
          {!history.dailyDigests.length ? (
            <div className="rounded-xl border border-dashed border-[var(--md-outline-variant)] p-8 text-center font-label text-sm text-[var(--md-on-surface-variant)]">
              还没有可归档的日报发送记录。首次发送成功后，这里会开始沉淀每日摘要历史。
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Surface>
            <h3 className="font-headline font-bold text-[var(--md-on-surface)]">Delivery Health (30d)</h3>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-headline text-3xl font-black text-emerald-500">{successRate}%</span>
              <span className="mb-1 font-label text-sm text-[var(--md-on-surface-variant)]">Success rate</span>
            </div>
            <div className="mt-6 space-y-4">
              {history.deliveryHealth.channelHealth.map((ch) => (
                <div key={ch.channelType}>
                  <div className="mb-1 flex items-center justify-between font-label text-xs">
                    <span className="text-[var(--md-on-surface)]">{channelLabel(ch.channelType)}</span>
                    <span className="text-[var(--md-on-surface-variant)]">{ch.successCount}/{ch.totalCount || 0}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--md-surface-bright)]">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${ch.totalCount ? Math.round((ch.successCount / ch.totalCount) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          <div className="rounded-xl border border-[var(--md-outline-variant)]/30 bg-[var(--md-surface-dim)] p-5">
            <h3 className="font-headline font-bold text-[var(--md-on-surface)]">Configure Channels</h3>
            <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">Add or modify webhook URLs to receive daily insights.</p>
            <Link href={`/projects/${project.id}/settings`} className="mt-4 flex w-full items-center justify-center rounded-lg border border-[var(--md-outline-variant)] py-2.5 font-label text-sm text-[var(--md-on-surface)] transition hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]">
              Manage Webhooks
            </Link>
          </div>
        </div>
      </div>

      <ProjectMonitoringHistory
        projectId={project.id}
        pollJobs={history.pollJobs}
        deliveries={history.webhookDeliveries}
        suppressions={history.suppressions}
        dailyDigests={history.dailyDigests}
      />
    </div>
  );
}
