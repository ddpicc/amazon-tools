type AlertListProps = {
  alerts: Array<{
    id: string;
    title: string;
    message: string | null;
    severity: string;
    createdAt: Date;
    trackedAsin?: {
      asin: string;
    } | null;
  }>;
};

const severityStyles: Record<string, string> = {
  INFO: "bg-sky-500/15 text-sky-300",
  WARNING: "bg-amber-500/15 text-amber-300",
  CRITICAL: "bg-rose-500/15 text-rose-300"
};

export function AlertList({ alerts }: AlertListProps) {
  if (!alerts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
        暂无告警，后续每日采集发现异常时会显示在这里。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500">{alert.trackedAsin?.asin ?? "未知 ASIN"}</p>
              <h3 className="mt-1 text-base font-semibold text-zinc-50">{alert.title}</h3>
              {alert.message ? <p className="mt-2 text-sm text-zinc-400">{alert.message}</p> : null}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${severityStyles[alert.severity] ?? "bg-zinc-800 text-zinc-300"}`}>
              {alert.severity}
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-500">{new Date(alert.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
