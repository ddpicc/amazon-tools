import { TrackedAsinRole } from "@prisma/client";
import { auth } from "@/auth";
import { TrackedAsinPickerDialog } from "@/components/projects/tracked-asin-picker-dialog";
import {
  MetricCard,
  Surface
} from "@/components/projects/project-workspace-shell";
import { db } from "@/server/db";
import { getTrackedAsinDailySnapshot } from "@/server/services/project-asin-snapshot";

function mv(v: number | null, fmt?: (v: number) => string) {
  return v === null ? "-" : fmt ? fmt(v) : String(v);
}

function getDailySales(value: unknown) {
  if (Array.isArray(value) && value.length >= 2 && typeof value[1] === "number") {
    return value[1];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.value === "number") {
      return record.value;
    }
    if (typeof record.sales === "number") {
      return record.sales;
    }
    if (typeof record.count === "number") {
      return record.count;
    }
  }

  return null;
}

function getMonthlySales(asinSalesCount: number | null, listingSaleCount: number | null) {
  return asinSalesCount && asinSalesCount > 0 ? asinSalesCount : listingSaleCount;
}

function getBsrCategoryRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ name: string; rank: string | null }>;
  }

  return value
    .map((item) => {
      if (!Array.isArray(item) || item.length < 3) {
        return null;
      }

      const name = typeof item[0] === "string" ? item[0] : null;
      const rankValue = item[2];
      const rank =
        typeof rankValue === "string" || typeof rankValue === "number"
          ? `#${rankValue}`
          : null;

      if (!name) {
        return null;
      }

      return { name, rank };
    })
    .filter((item): item is { name: string; rank: string | null } => Boolean(item));
}

function getDescriptionLines(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/<br\s*\/?>/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ProjectTrendsPage({
  params,
  searchParams
}: {
  params: { projectId: string };
  searchParams?: { asinId?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      marketplace: true,
      trackedAsins: {
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          asin: true,
          role: true,
          title: true,
          snapshots: {
            select: {
              capturedAt: true
            },
            orderBy: {
              capturedAt: "desc"
            },
            take: 1
          }
        }
      }
    }
  });
  if (!project) return null;

  const fallbackAsin =
    project.trackedAsins.find((item) => item.role === TrackedAsinRole.OWN) ??
    project.trackedAsins[0];

  if (!fallbackAsin) {
    return (
      <div className="mx-auto max-w-6xl">
        <Surface>
          <h1 className="font-headline text-2xl font-bold text-[var(--md-on-surface)]">ASIN Snapshots</h1>
          <p className="mt-3 font-label text-sm text-[var(--md-on-surface-variant)]">
            当前项目还没有可查看的 ASIN。先到 ASINs 页面添加监控对象。
          </p>
        </Surface>
      </div>
    );
  }

  const selectedAsinId = project.trackedAsins.some((item) => item.id === searchParams?.asinId)
    ? searchParams?.asinId!
    : fallbackAsin.id;

  const snapshotOverview = await getTrackedAsinDailySnapshot(selectedAsinId);
  const selectedAsin = snapshotOverview.trackedAsin;
  const snapshot = snapshotOverview.snapshot;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Daily ASIN snapshot</p>
          <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">
            Snapshots
          </h1>
          <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">
            查看单个 ASIN 当天最新的采集快照，包括价格、评分、评论、BSR 和 listing 状态。
          </p>
        </div>
      </div>

      <TrackedAsinPickerDialog
        projectId={project.id}
        selectedAsinId={selectedAsin.id}
        items={project.trackedAsins.map((item) => ({
          id: item.id,
          asin: item.asin,
          role: item.role,
          title: item.title,
          capturedAt: item.snapshots[0]?.capturedAt ?? null
        }))}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="当前价格" ownValue={mv(snapshot?.price ?? null, (v) => `$${v.toFixed(2)}`)} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{selectedAsin.role === TrackedAsinRole.OWN ? "Own listing" : "Competitor listing"}</span>} />
        <MetricCard label="当前评分" ownValue={mv(snapshot?.rating ?? null)} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{selectedAsin.brand ?? "Brand unavailable"}</span>} />
        <MetricCard label="评论数" ownValue={mv(snapshot?.reviewCount ?? null)} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{snapshotOverview.hasTodaySnapshot ? "Today snapshot" : "Latest available snapshot"}</span>} />
        <MetricCard label="当前 BSR" ownValue={mv(snapshot?.bsr ?? null)} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{snapshot?.category ?? selectedAsin.category ?? "Category unavailable"}</span>} />
      </div>

      <Surface>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">标题</h3>
            <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">
              {selectedAsin.title ?? "No synced title"}
            </p>
          </div>
        </div>
      </Surface>

      {!snapshot ? (
        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">今天还没有快照</h3>
          <p className="mt-2 font-label text-sm text-[var(--md-on-surface-variant)]">
            这个 ASIN 还没有采集到可展示的快照数据。
          </p>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Surface>
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">销量与排名</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">月销量</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(getMonthlySales(snapshot.asinSalesCount ?? null, snapshot.listingSaleCount ?? null))}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">每日销量</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(getDailySales(snapshot.listingSaleCountOfDaily))}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
              <p className="text-sm text-[var(--md-on-surface-variant)]">细分类目排名</p>
              <div className="mt-3 space-y-3">
                {getBsrCategoryRows(snapshot.bsrCategory).length ? (
                  getBsrCategoryRows(snapshot.bsrCategory).map((item) => (
                    <div
                      key={`${item.name}-${item.rank ?? "-"}`}
                      className="flex items-center justify-between gap-4 rounded-xl bg-[var(--md-surface-container)] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[var(--md-on-surface)]">{item.name}</span>
                      <span className="text-sm font-semibold text-[var(--md-primary)]">{item.rank ?? "-"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--md-on-surface-variant)]">暂无细分类目排名</p>
                )}
              </div>
            </div>
          </Surface>

          <Surface>
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">Listing 状态</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">FBA</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{snapshot.isFBA === null ? "-" : snapshot.isFBA ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">变体数</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.variantCount ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">Buybox Seller</p>
                <p className="mt-2 text-lg font-semibold text-[var(--md-on-surface)]">{snapshot.buyboxSeller ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">卖家数量</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.sellerCount ?? null)}</p>
              </div>
            </div>
          </Surface>

          <Surface className="lg:col-span-2">
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">补充信息</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">店铺</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.storeName ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">父 ASIN</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.parentAsin ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">配送费</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{mv(snapshot.shipCost ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">Coupon</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{mv(snapshot.coupon ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">上架日期</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.onlineDate ? new Date(snapshot.onlineDate).toLocaleDateString("zh-CN") : "-"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">在线天数</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{mv(snapshot.onlineDays ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">主图视频</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.hasVideo ? "有" : "无"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">A+页面</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.aPlus ? "有" : "无"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">品牌旗舰店</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.hasBrandStore ? "有" : "无"}</p>
              </div>
            </div>
          </Surface>

          <Surface className="lg:col-span-2">
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">五点描述</h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                {getDescriptionLines(snapshot.description).length ? (
                  <div className="space-y-3">
                    {getDescriptionLines(snapshot.description).map((item, index) => (
                      <div key={`${index}-${item}`} className="flex gap-3 text-sm leading-6 text-[var(--md-on-surface)]">
                        <span className="mt-[0.6rem] h-1.5 w-1.5 flex-none rounded-full bg-[var(--md-primary)]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--md-on-surface-variant)]">暂无五点描述</p>
                )}
              </div>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
