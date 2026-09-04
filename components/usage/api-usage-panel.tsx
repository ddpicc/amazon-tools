type ApiUsagePanelProps = {
  usage: {
    todayRequestConsumed: number;
    byApi: Array<{
      apiName: string;
      requestConsumed: number;
      callCount: number;
    }>;
    recentLogs: Array<{
      id: string;
      apiName: string;
      requestConsumed: number;
      status: string;
      errorMessage: string | null;
      contextRef: string | null;
      asin: string | null;
      calledAt: Date;
    }>;
  };
};

function apiLabel(apiName: string) {
  const labels: Record<string, string> = {
    ASINSubscription: "商品监控订阅",
    ASINSubscriptionCollection: "商品数据采集",
    ASINRequestKeyword: "关键词数据采集",
    ProductRequest: "商品数据查询",
    ProductReviewsCollection: "评论采集",
    ProductReviewsQuery: "评论查询",
    ReveyesReviewsFetch: "评论数据采集"
  };
  return labels[apiName] ?? "数据服务";
}

export function ApiUsagePanel({ usage }: ApiUsagePanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">数据用量</h2>
          <p className="mt-1 text-sm text-zinc-400">按项目记录数据服务消耗，后续可用于套餐和成本控制。</p>
        </div>
        <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-right">
          <p className="text-sm text-zinc-500">今日消耗</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-50">{usage.todayRequestConsumed}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {usage.byApi.map((item) => (
          <div key={item.apiName} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="font-medium text-zinc-100">{apiLabel(item.apiName)}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {item.callCount} calls · {item.requestConsumed} requests
            </p>
          </div>
        ))}
        {!usage.byApi.length ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400">
            暂无数据用量，项目初始化或每日采集后会记录。
          </div>
        ) : null}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
          <thead className="bg-zinc-950/70 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">数据服务</th>
              <th className="px-4 py-3 font-medium">ASIN</th>
              <th className="px-4 py-3 font-medium">消耗</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {!usage.recentLogs.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  暂无调用记录。
                </td>
              </tr>
            ) : null}
            {usage.recentLogs.map((log) => (
              <tr key={log.id} className="text-zinc-200 hover:bg-zinc-950/40">
                <td className="px-4 py-3">{apiLabel(log.apiName)}</td>
                <td className="px-4 py-3">{log.asin ?? log.contextRef ?? "-"}</td>
                <td className="px-4 py-3">{log.requestConsumed}</td>
                <td className="px-4 py-3">{log.status}</td>
                <td className="px-4 py-3 text-zinc-400">{new Date(log.calledAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
