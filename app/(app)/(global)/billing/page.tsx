import { auth } from "@/auth";
import { getBillingStatusPresentation } from "@/lib/billing-status";
import { formatDateTime } from "@/lib/date-time";
import { getBillingSummary } from "@/server/services/billing/get-billing-summary";

function formatCny(priceCents: number) {
  return `¥${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

function getUpgradeContext(from?: string) {
  switch (from) {
    case "create-project":
      return {
        title: "你是从“创建项目”跳转过来的",
        description: "当前账号的项目数或总 ASIN 数额度不足，升级套餐后可以继续创建新项目。"
      };
    case "add-asin":
      return {
        title: "你是从“添加 ASIN”跳转过来的",
        description: "当前账号的总 ASIN 额度不足，升级套餐后可以继续添加新的监控 ASIN。"
      };
    default:
      return null;
  }
}

export default async function BillingPage({
  searchParams
}: {
  searchParams?: { from?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const summary = await getBillingSummary(session.user.id);
  const upgradeContext = getUpgradeContext(searchParams?.from);
  const billingStatus = getBillingStatusPresentation(summary.entitlements.billingState);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--md-primary)]">Billing</p>
        <h1 className="mt-3 font-headline text-4xl font-semibold text-[var(--md-on-surface)]">套餐与计费</h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--md-on-surface-variant)]">
          这里集中展示当前套餐、资源使用情况，以及可升级的套餐选项。当前阶段重点控制项目数与总 ASIN 数。
        </p>
      </div>

      {upgradeContext ? (
        <section className="rounded-3xl border border-[var(--md-primary)]/25 bg-[var(--md-primary)]/8 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--md-primary)]">升级提示</p>
          <h2 className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">
            {upgradeContext.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--md-on-surface-variant)]">
            {upgradeContext.description}
          </p>
        </section>
      ) : null}

      {summary.planChange.recentlyChanged ? (
        <section className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">套餐已更新</p>
          <h2 className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">
            你的套餐权益已经生效
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--md-on-surface-variant)]">
            最近一次套餐变更时间：{summary.planChange.lastChangedAt ? formatDateTime(summary.planChange.lastChangedAt) : "刚刚"}。下面的项目数、ASIN 上限和当前套餐信息都已经按最新权益刷新。
          </p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--md-primary)]">当前套餐</p>
            <h2 className="mt-2 font-headline text-3xl font-semibold text-[var(--md-on-surface)]">
              {summary.entitlements.plan.displayName}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${billingStatus.badgeClassName}`}>
                {billingStatus.label}
              </span>
              <p className="text-sm text-[var(--md-on-surface-variant)]">{billingStatus.description}</p>
            </div>
            <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
              来源：{summary.entitlements.source === "subscription" ? "订阅记录" : "旧版 plan 回退"}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] px-4 py-3 text-sm text-[var(--md-on-surface-variant)]">
            手动刷新规则：每个 ASIN 每天最多 {summary.entitlements.limits.maxManualRefreshesPerAsinPerDay} 次
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
            <p className="text-sm text-[var(--md-on-surface-variant)]">项目</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-[var(--md-on-surface)]">
              {summary.entitlements.usage.projectCount} / {summary.entitlements.limits.maxProjects}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
            <p className="text-sm text-[var(--md-on-surface-variant)]">活跃 ASIN</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-[var(--md-on-surface)]">
              {summary.entitlements.usage.activeTrackedAsinCount} / {summary.entitlements.limits.maxTrackedAsins}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
            <p className="text-sm text-[var(--md-on-surface-variant)]">每项目 Own</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-[var(--md-on-surface)]">
              {summary.entitlements.limits.maxOwnAsinsPerProject}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
            <p className="text-sm text-[var(--md-on-surface-variant)]">每项目 Competitor</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-[var(--md-on-surface)]">
              {summary.entitlements.limits.maxCompetitorAsinsPerProject}
            </p>
          </div>
        </div>
      </section>

      <section id="plans" className="grid gap-6 lg:grid-cols-2">
        {summary.plans.map((plan) => {
          const active = plan.code === summary.entitlements.plan.code;
          const recommended = upgradeContext && !active && plan.priceCents > summary.entitlements.plan.priceCents;

          return (
            <article
              key={plan.code}
              className={`rounded-3xl border p-6 ${
                active
                  ? "border-[var(--md-primary)] bg-[var(--md-primary)]/8"
                  : recommended
                    ? "border-[var(--md-secondary)] bg-[var(--md-secondary)]/10 shadow-[0_0_0_1px_rgba(103,80,164,0.18)]"
                    : "border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--md-primary)]">{plan.code}</p>
                  <h3 className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">
                    {plan.displayName}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
                    {plan.description ?? "暂无说明"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-headline text-3xl font-semibold text-[var(--md-on-surface)]">
                    {formatCny(plan.priceCents)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">/ 月</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
                  <p className="text-sm text-[var(--md-on-surface-variant)]">项目上限</p>
                  <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">{plan.maxProjects}</p>
                </div>
                <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
                  <p className="text-sm text-[var(--md-on-surface-variant)]">总 ASIN 上限</p>
                  <p className="mt-2 font-headline text-2xl font-semibold text-[var(--md-on-surface)]">{plan.maxTrackedAsins}</p>
                </div>
                <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
                  <p className="text-sm text-[var(--md-on-surface-variant)]">高级分析</p>
                  <p className="mt-2 font-headline text-lg font-semibold text-[var(--md-on-surface)]">
                    {plan.canUseAdvancedAnalytics ? "支持" : "未开放"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--md-surface-container-lowest)] p-4">
                  <p className="text-sm text-[var(--md-on-surface-variant)]">选品能力</p>
                  <p className="mt-2 font-headline text-lg font-semibold text-[var(--md-on-surface)]">
                    {plan.canUseProductResearch ? "支持" : "未开放"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-[var(--md-on-surface-variant)]">
                  {active
                    ? "当前生效套餐"
                    : recommended
                      ? "这是更适合当前额度需求的升级选项。"
                      : "暂未接入在线购买，可由后台直接切换套餐。"}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    active
                      ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                      : recommended
                        ? "bg-[var(--md-secondary)] text-white"
                        : "bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)]"
                  }`}
                >
                  {active ? "当前套餐" : recommended ? "推荐升级" : "可升级"}
                </span>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
