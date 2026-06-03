import { formatDateTime } from "@/lib/date-time";
import { getAdminOverview } from "@/server/services/admin-overview";

function AdminMetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-6">
      <p className="text-sm text-[var(--md-on-surface-variant)]">{label}</p>
      <p className="mt-4 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">{value}</p>
      <p className="mt-3 text-sm text-[var(--md-on-surface-variant)]">{hint}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">Admin Console</p>
        <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">
          管理总览
        </h1>
        <p className="mt-3 text-sm text-[var(--md-on-surface-variant)]">
          这里集中查看系统规模、Sorftime 积分和最近的新增情况。
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="用户总数"
          value={overview.userCount.toLocaleString("zh-CN")}
          hint={overview.latestUserAt ? `最近新增：${formatDateTime(overview.latestUserAt)}` : "暂无用户数据"}
        />
        <AdminMetricCard
          label="项目总数"
          value={overview.projectCount.toLocaleString("zh-CN")}
          hint={overview.latestProjectAt ? `最近创建：${formatDateTime(overview.latestProjectAt)}` : "暂无项目数据"}
        />
        <AdminMetricCard
          label="订阅 ASIN"
          value={overview.trackedAsinCount.toLocaleString("zh-CN")}
          hint={`监控订阅记录 ${overview.activeSubscriptionCount.toLocaleString("zh-CN")} 条`}
        />
        <AdminMetricCard
          label="Sorftime 剩余积分"
          value={overview.sorftimeCoins === null ? "--" : overview.sorftimeCoins.toLocaleString("zh-CN")}
          hint={overview.sorftimeRequestLeft === null ? "余额为全局统一积分" : `接口剩余请求：${overview.sorftimeRequestLeft}`}
        />
      </div>

      <div className="mt-10 rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">系统摘要</h2>
            <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
              先看整体规模，再从左侧进入用户页查看全部账号。后面可以继续往这里追加项目、任务、账单和 API 使用统计。
            </p>
          </div>
          <a
            href="/admin/users"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] px-4 py-2 text-sm font-medium text-[var(--md-on-surface)] transition hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            查看所有用户
          </a>
        </div>
      </div>
    </div>
  );
}
