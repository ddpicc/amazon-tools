"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AsinFiltersProps = {
  projectId: string;
  items: Array<{
    id: string;
    asin: string;
    marketplace: string;
    role: string;
    title: string | null;
    brand: string | null;
    status: string;
    lastSuccessAt: Date | null;
    category: string | null;
  }>;
};

function roleLabel(role: string) {
  return role === "OWN" ? "Own" : "Competitor";
}

function statusStyle(status: string) {
  if (status === "ACTIVE") return "bg-emerald-500/10 text-emerald-400";
  if (status === "PAUSED") return "bg-amber-500/10 text-amber-300";
  return "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]";
}

function isSyncedToday(lastSuccessAt: Date | string | null) {
  if (!lastSuccessAt) {
    return false;
  }

  const syncedAt = new Date(lastSuccessAt);
  const now = new Date();

  return syncedAt.toDateString() === now.toDateString();
}

export function AsinTableWithFilters({ projectId, items }: AsinFiltersProps) {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recent");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runManualSync(asinId: string) {
    setSyncingId(asinId);
    setMessage(null);

    const response = await fetch(`/api/projects/${projectId}/asins/${asinId}/sync`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);

    setSyncingId(null);

    if (!response.ok) {
      setMessage(data?.error ?? "手动同步失败");
      return;
    }

    setMessage("手动同步已完成");
    router.refresh();
  }

  const filtered = useMemo(() => {
    const next = [...items].filter((item) => (roleFilter === "ALL" ? true : item.role === roleFilter));
    return next.sort((a, b) => {
      if (sortBy === "recent")
        return (b.lastSuccessAt ? new Date(b.lastSuccessAt).getTime() : 0) - (a.lastSuccessAt ? new Date(a.lastSuccessAt).getTime() : 0);
      return a.asin.localeCompare(b.asin);
    });
  }, [items, roleFilter, sortBy]);

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3 font-label text-sm text-[var(--md-on-surface)]">
          {message}
        </div>
      ) : null}

      {/* Filter toolbar — per variant_a_5 tab bar style */}
      <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]/50 px-2">
        <div className="flex">
          <button
            onClick={() => setRoleFilter("ALL")}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 font-headline text-sm font-semibold transition ${
              roleFilter === "ALL" ? "border-[var(--md-primary)] text-[var(--md-primary)]" : "border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setRoleFilter("OWN")}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 font-headline text-sm font-semibold transition ${
              roleFilter === "OWN" ? "border-[var(--md-primary)] text-[var(--md-primary)]" : "border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
            }`}
          >
            Own ASINs (本品)
          </button>
          <button
            onClick={() => setRoleFilter("COMPETITOR")}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 font-headline text-sm font-semibold transition ${
              roleFilter === "COMPETITOR" ? "border-[var(--md-primary)] text-[var(--md-primary)]" : "border-transparent text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
            }`}
          >
            Competitor ASINs (竞品)
          </button>
        </div>
        <div className="flex items-center gap-3 px-4">
          <span className="font-label text-xs text-[var(--md-on-surface-variant)]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-md border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-2 py-1 text-xs text-[var(--md-on-surface)]"
          >
            <option value="recent">按最近同步</option>
            <option value="asin">按 ASIN</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)]/30 font-label text-xs uppercase tracking-wider text-[var(--md-on-surface-variant)]">
              <th className="p-4 font-semibold">ASIN / Product</th>
              <th className="p-4 font-semibold">Market</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Last sync</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--md-outline-variant)]/50 font-label text-sm text-[var(--md-on-surface)]">
            {!filtered.length ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                  当前筛选条件下没有 ASIN。可以切换角色筛选，或在上方继续添加监控对象。
                </td>
              </tr>
            ) : null}
            {filtered.map((item) => {
              const canManualSync = !isSyncedToday(item.lastSuccessAt);

              return (
                <tr key={item.id} className="transition-colors hover:bg-[var(--md-surface-container-high)]">
                  <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-headline text-sm font-semibold text-[var(--md-on-surface)]">{item.asin}</p>
                      <p className="mt-1 max-w-[18rem] truncate text-xs text-[var(--md-on-surface-variant)]">{item.title ?? "尚未同步商品标题"}</p>
                      <p className="mt-1 text-xs text-[var(--md-outline)]">{item.brand ?? "Unknown brand"}</p>
                    </div>
                  </div>
                  </td>
                  <td className="p-4 text-[var(--md-on-surface-variant)]">{item.marketplace}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-[var(--md-surface-container)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[var(--md-on-surface-variant)]">
                      {roleLabel(item.role)}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--md-on-surface-variant)]">{item.category ?? "-"}</td>
                  <td className="p-4 text-[var(--md-on-surface-variant)]">
                    {item.lastSuccessAt ? new Date(item.lastSuccessAt).toLocaleString("zh-CN") : "未成功同步"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${statusStyle(item.status)}`} />
                      <span className="text-[var(--md-on-surface)]">{item.status}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {canManualSync ? (
                      <button
                        onClick={() => runManualSync(item.id)}
                        disabled={syncingId === item.id}
                        className="rounded-lg border border-[var(--md-primary)]/30 bg-[var(--md-primary)]/10 px-3 py-2 font-headline text-xs font-semibold text-[var(--md-primary)] transition hover:bg-[var(--md-primary)]/15 disabled:opacity-60"
                      >
                        {syncingId === item.id ? "同步中..." : "手动同步"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
