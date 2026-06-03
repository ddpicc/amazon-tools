import Link from "next/link";

type AsinTableProps = {
  projectId: string;
  items: Array<{
    id: string;
    asin: string;
    role: string;
    title: string | null;
    brand: string | null;
    status: string;
    lastSuccessAt: Date | null;
    lastSyncedAt: Date | null;
    category: string | null;
  }>;
};

function roleLabel(role: string) {
  return role === "OWN" ? "Own" : "Competitor";
}

export function AsinTable({ projectId, items }: AsinTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
        <thead className="bg-zinc-950/70 text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">ASIN</th>
            <th className="px-4 py-3 font-medium">角色</th>
            <th className="px-4 py-3 font-medium">标题</th>
            <th className="px-4 py-3 font-medium">品牌</th>
            <th className="px-4 py-3 font-medium">类目</th>
            <th className="px-4 py-3 font-medium">最后成功同步</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {items.map((item) => (
            <tr key={item.id} className="text-zinc-200 hover:bg-zinc-950/40">
              <td className="px-4 py-3">
                <Link href={`/projects/${projectId}/asins/${item.id}`} className="font-medium text-amber-300">
                  {item.asin}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                  {roleLabel(item.role)}
                </span>
              </td>
              <td className="px-4 py-3">{item.title ?? "尚未同步"}</td>
              <td className="px-4 py-3">{item.brand ?? "-"}</td>
              <td className="px-4 py-3">{item.category ?? "-"}</td>
              <td className="px-4 py-3">
                {item.lastSuccessAt ? new Date(item.lastSuccessAt).toLocaleString() : "未成功同步"}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
