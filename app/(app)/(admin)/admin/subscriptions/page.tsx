import { getAdminSubscriptionReconciliation } from "@/server/services/admin-subscription-reconciliation";

function SummaryCard({
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

export default async function AdminSubscriptionsPage() {
  const result = await getAdminSubscriptionReconciliation();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="max-w-4xl">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">Admin Console</p>
        <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">订阅对账</h1>
        <p className="mt-3 text-sm text-[var(--md-on-surface-variant)]">
          对比 Sorftime 已订阅 ASIN 和本地项目中的 US ASIN。只存在于一侧的记录会标红，方便发现订阅遗漏或脏数据。
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <SummaryCard
          label="Sorftime 已订阅"
          value={result.sorftimeCount.toLocaleString("zh-CN")}
          hint="来源：ASINSubscriptionQuery"
        />
        <SummaryCard
          label="本地项目 ASIN"
          value={result.localCount.toLocaleString("zh-CN")}
          hint="按唯一 ASIN 去重"
        />
        <SummaryCard
          label="差异记录"
          value={result.mismatchCount.toLocaleString("zh-CN")}
          hint={result.mismatchCount > 0 ? "存在未对齐记录" : "当前两边已对齐"}
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
        <div className="grid grid-cols-[180px_120px_120px_minmax(360px,1fr)] gap-4 border-b border-[var(--md-outline-variant)] px-6 py-4 text-xs uppercase tracking-[0.2em] text-[var(--md-on-surface-variant)]">
          <span>ASIN</span>
          <span>Sorftime</span>
          <span>本地项目</span>
          <span>关联项目 / 用户</span>
        </div>

        {result.rows.map((row) => (
          <div
            key={row.asin}
            className={`grid grid-cols-[180px_120px_120px_minmax(360px,1fr)] gap-4 border-b border-[var(--md-outline-variant)] px-6 py-5 text-sm last:border-b-0 ${
              row.mismatch ? "bg-[rgba(239,68,68,0.08)]" : ""
            }`}
          >
            <div className="font-medium text-[var(--md-on-surface)]">{row.asin}</div>
            <div className={row.inSorftime ? "text-emerald-300" : "text-red-300"}>
              {row.inSorftime ? "已订阅" : "缺失"}
            </div>
            <div className={row.inLocal ? "text-emerald-300" : "text-red-300"}>
              {row.inLocal ? "已存在" : "缺失"}
            </div>
            <div className="text-[var(--md-on-surface-variant)]">
              {row.localReferences.length ? (
                <div className="space-y-2">
                  {row.localReferences.map((reference) => (
                    <div key={`${row.asin}-${reference.projectId}-${reference.userEmail}`}>
                      <span className="text-[var(--md-on-surface)]">{reference.projectName}</span>
                      <span> / </span>
                      <span>{reference.userName || reference.userEmail}</span>
                      {reference.userName ? (
                        <span className="text-[var(--md-on-surface-variant)]"> ({reference.userEmail})</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-red-300">本地没有这个 ASIN</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
