type Provenance = {
  sourceKind: "LIVE_PROVIDER" | "MOCK" | "IMPORT" | "USER_INPUT" | "DERIVED" | "LEGACY_UNKNOWN";
  provider?: string;
  apiName?: string;
  capturedAt: Date | null;
} | null;

export function DataProvenance({ capture, fallbackCapturedAt }: { capture: Provenance; fallbackCapturedAt?: Date | null }) {
  const capturedAt = capture?.capturedAt ?? fallbackCapturedAt ?? null;
  const isMock = capture?.sourceKind === "MOCK";
  const isLegacy = !capture || capture.sourceKind === "LEGACY_UNKNOWN";
  const label = isLegacy ? "历史数据" : isMock ? "模拟数据" : "实时数据";

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 font-label text-xs ${isMock ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-[var(--md-outline-variant)]/60 bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]"}`}>
      <span className="font-semibold">数据状态：{label}</span>
      {capturedAt ? <span> · 采集于 {capturedAt.toLocaleString("zh-CN")}</span> : null}
      {isMock ? <p className="mt-1">模拟数据仅用于演示，不代表 Amazon 实时事实或经营估算。</p> : null}
      {isLegacy ? <p className="mt-1">该记录产生于来源追踪启用前，无法可靠还原其数据来源。</p> : null}
    </div>
  );
}
