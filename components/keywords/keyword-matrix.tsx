type KeywordMatrixProps = {
  items: Array<{
    id: string;
    keyword: string;
    ownBestRank: number | null;
    competitorBestRank: number | null;
    competitorAsin: string | null;
    trackedCount: number;
    updatedAt: Date;
  }>;
};

function leaderLabel(item: KeywordMatrixProps["items"][number]) {
  if (item.ownBestRank === null && item.competitorBestRank === null) {
    return "未同步";
  }

  if (item.ownBestRank !== null && item.competitorBestRank !== null) {
    if (item.ownBestRank < item.competitorBestRank) {
      return "Own";
    }

    if (item.ownBestRank > item.competitorBestRank) {
      return item.competitorAsin ?? "Competitor";
    }

    return "持平";
  }

  return item.ownBestRank !== null ? "Own" : item.competitorAsin ?? "Competitor";
}

export function KeywordMatrix({ items }: KeywordMatrixProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">关键词矩阵</h2>
          <p className="mt-1 text-sm text-zinc-400">从项目视角查看 own 与竞品在每个关键词上的当前最佳排名。</p>
        </div>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
          {items.length} Rows
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
          <thead className="bg-zinc-950/70 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">关键词</th>
              <th className="px-4 py-3 font-medium">Own 最佳</th>
              <th className="px-4 py-3 font-medium">竞品最佳</th>
              <th className="px-4 py-3 font-medium">领先方</th>
              <th className="px-4 py-3 font-medium">最近更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {!items.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  暂无关键词排名数据，先同步一个 ASIN。
                </td>
              </tr>
            ) : null}
            {items.map((item) => (
              <tr key={item.id} className="text-zinc-200 hover:bg-zinc-950/40">
                <td className="px-4 py-3 font-medium text-zinc-100">{item.keyword}</td>
                <td className="px-4 py-3">{item.ownBestRank ?? "-"}</td>
                <td className="px-4 py-3">{item.competitorBestRank ?? "-"}</td>
                <td className="px-4 py-3">{leaderLabel(item)}</td>
                <td className="px-4 py-3 text-zinc-400">{new Date(item.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
