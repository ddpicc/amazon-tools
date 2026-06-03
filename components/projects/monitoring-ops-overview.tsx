import type { MonitoringOpsOverview } from "@/server/services/monitoring-ops";

type MonitoringOpsOverviewProps = {
  overview: MonitoringOpsOverview;
};

function formatTime(value: Date | null) {
  if (!value) {
    return "无时间";
  }

  return new Date(value).toLocaleString("zh-CN");
}

function channelLabel(channelType: string) {
  if (channelType === "FEISHU") {
    return "飞书";
  }

  if (channelType === "WECOM") {
    return "企微";
  }

  return channelType;
}

function failureStyle(label: string) {
  if (label.includes("权限")) {
    return "bg-rose-500/15 text-rose-300";
  }

  if (label.includes("限流")) {
    return "bg-amber-500/15 text-amber-300";
  }

  if (label.includes("Sorftime")) {
    return "bg-sky-500/15 text-sky-300";
  }

  return "bg-zinc-800 text-zinc-300";
}

function failureDetailStyle(detail: string | null) {
  return detail ? "text-zinc-500" : "text-zinc-600";
}

export function MonitoringOpsOverviewPanel({ overview }: MonitoringOpsOverviewProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Operations</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-50">监控运行面板</h2>
          <p className="mt-2 text-sm text-zinc-400">
            最近 {overview.windowHours} 小时内，汇总项目轮询、Webhook 投递失败和重复告警抑制情况。
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
          覆盖项目数 <span className="font-semibold text-zinc-100">{overview.projectCount}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl bg-zinc-950 p-4">
          <p className="text-sm text-zinc-500">已轮询项目</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">{overview.stats.polledProjectCount}</p>
        </div>
        <div className="rounded-2xl bg-zinc-950 p-4">
          <p className="text-sm text-zinc-500">成功轮询任务</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">{overview.stats.successfulPollJobCount}</p>
        </div>
        <div className="rounded-2xl bg-zinc-950 p-4">
          <p className="text-sm text-zinc-500">失败轮询任务</p>
          <p className="mt-2 text-3xl font-semibold text-rose-300">{overview.stats.failedPollJobCount}</p>
        </div>
        <div className="rounded-2xl bg-zinc-950 p-4">
          <p className="text-sm text-zinc-500">Webhook 失败</p>
          <p className="mt-2 text-3xl font-semibold text-rose-300">{overview.stats.failedWebhookCount}</p>
        </div>
        <div className="rounded-2xl bg-zinc-950 p-4">
          <p className="text-sm text-zinc-500">抑制重复告警</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{overview.stats.suppressedAlertCount}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-zinc-100">最近失败轮询</h3>
            <span className="text-xs text-zinc-500">{overview.recentFailedPolls.length} 条</span>
          </div>
          <div className="mt-4 space-y-3">
            {overview.recentFailedPolls.length ? (
              overview.recentFailedPolls.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">{item.projectName}</p>
                    <span className="text-xs text-zinc-500">{formatTime(item.finishedAt)}</span>
                  </div>
                  <p className="mt-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${failureStyle(item.failureLabel)}`}>
                      {item.failureLabel}
                    </span>
                  </p>
                  {item.failureDetail ? <p className={`mt-2 text-xs ${failureDetailStyle(item.failureDetail)}`}>{item.failureDetail}</p> : null}
                  <p className="mt-2 text-sm text-zinc-400">{item.errorMessage ?? "Unknown poll error"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">最近没有失败轮询。</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-zinc-100">最近 Webhook 失败</h3>
            <span className="text-xs text-zinc-500">{overview.recentWebhookFailures.length} 条</span>
          </div>
          <div className="mt-4 space-y-3">
            {overview.recentWebhookFailures.length ? (
              overview.recentWebhookFailures.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">
                      {item.projectName} · {channelLabel(item.channelType)}
                    </p>
                    <span className="text-xs text-zinc-500">{formatTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${failureStyle(item.failureLabel)}`}>
                      {item.failureLabel}
                    </span>
                  </p>
                  {item.failureDetail ? <p className={`mt-2 text-xs ${failureDetailStyle(item.failureDetail)}`}>{item.failureDetail}</p> : null}
                  <p className="mt-2 text-sm text-zinc-300">{item.alertTitle}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.channelName ? `${item.channelName} · ` : ""}
                    {item.errorMessage ?? "Unknown webhook delivery error"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">最近没有 Webhook 失败。</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-zinc-100">最近抑制的重复告警</h3>
            <span className="text-xs text-zinc-500">{overview.recentSuppressions.length} 条</span>
          </div>
          <div className="mt-4 space-y-3">
            {overview.recentSuppressions.length ? (
              overview.recentSuppressions.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">{item.projectName}</p>
                    <span className="text-xs text-zinc-500">{formatTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{item.asin} · {item.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.type} · 冷却 {item.cooldownMinutes} 分钟
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">最近没有重复告警被抑制。</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
