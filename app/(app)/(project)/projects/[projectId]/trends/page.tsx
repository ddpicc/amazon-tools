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

function formatStructuredLabel(value: string) {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderStructuredValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--md-on-surface-variant)]">-</span>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="break-all text-[var(--md-on-surface)]">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-[var(--md-on-surface-variant)]">-</span>;
    }

    const primitiveItems = value.every(
      (item) =>
        item === null ||
        item === undefined ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (primitiveItems) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className="rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-1 text-xs text-[var(--md-on-surface)]"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container)] p-3"
          >
            {renderStructuredValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, entryValue]) =>
        entryValue !== null &&
        entryValue !== undefined &&
        !(typeof entryValue === "string" && entryValue.trim() === "")
    );

    if (!entries.length) {
      return <span className="text-[var(--md-on-surface-variant)]">-</span>;
    }

    return (
      <div className={depth === 0 ? "grid gap-3" : "grid gap-2"}>
        {entries.map(([key, entryValue]) => (
          <div
            key={key}
            className="rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container)] p-3"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--md-on-surface-variant)]">
              {formatStructuredLabel(key)}
            </p>
            <div className="mt-2 text-sm">{renderStructuredValue(entryValue, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="break-all text-[var(--md-on-surface)]">{String(value)}</span>;
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
        <MetricCard label="评论数" ownValue={mv(snapshot?.reviewCount ?? null)} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{selectedAsin.category ?? "Category unavailable"}</span>} />
        <MetricCard label="当前 BSR" ownValue={mv(snapshot?.bsr ?? null)} footer={<span className="font-label text-xs text-[var(--md-on-surface-variant)]">{snapshotOverview.hasTodaySnapshot ? "Today snapshot" : "Latest available snapshot"}</span>} />
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
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">定价与销量</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">标价</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.listPrice ?? null, (v) => `$${v.toFixed(2)}`)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">Coupon</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.coupon ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">销量估算</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.asinSalesCount ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">Listing 销量</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.listingSaleCount ?? null)}</p>
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
                <p className="text-sm text-[var(--md-on-surface-variant)]">在线天数</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--md-on-surface)]">{mv(snapshot.onlineDays ?? null)}</p>
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
                <p className="text-sm text-[var(--md-on-surface-variant)]">上架日期</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.onlineDate ? new Date(snapshot.onlineDate).toLocaleDateString("zh-CN") : "-"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">Video</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.hasVideo ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">A+</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.aPlus ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">Brand Store</p>
                <p className="mt-2 text-base font-semibold text-[var(--md-on-surface)]">{snapshot.hasBrandStore ? "Yes" : "No"}</p>
              </div>
            </div>
          </Surface>

          <Surface className="lg:col-span-2">
            <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">详情字段</h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                <p className="text-sm text-[var(--md-on-surface-variant)]">描述</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--md-on-surface)]">{snapshot.description ?? "-"}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                  <p className="text-sm text-[var(--md-on-surface-variant)]">每日销量明细</p>
                  <div className="mt-3 text-sm">
                    {renderStructuredValue(snapshot.listingSaleCountOfDaily)}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
                  <p className="text-sm text-[var(--md-on-surface-variant)]">BSR 类目</p>
                  <div className="mt-3 text-sm">{renderStructuredValue(snapshot.bsrCategory)}</div>
                </div>
              </div>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
