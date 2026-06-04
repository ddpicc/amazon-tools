"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AsinMultiLineChart } from "@/components/charts/asin-multi-line-chart";
import { Surface } from "@/components/projects/project-workspace-shell";

type AsinSeries = {
  key: string;
  label: string;
  role: "OWN" | "COMPETITOR";
  color: string;
};

type TrendRow = Record<string, string | number | null>;

type CompareTrendPanelsProps = {
  bsrTrend: TrendRow[];
  priceTrend: TrendRow[];
  ratingTrend: TrendRow[];
  reviewTrend: TrendRow[];
  series: AsinSeries[];
};

export function CompareTrendPanels({
  bsrTrend,
  priceTrend,
  ratingTrend,
  reviewTrend,
  series
}: CompareTrendPanelsProps) {
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);

  useEffect(() => {
    setHiddenKeys((current) => current.filter((key) => series.some((item) => item.key === key)));
  }, [series]);

  function toggleKey(key: string) {
    setHiddenKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  return (
    <div className="space-y-6">
      <Surface>
        <div className="flex flex-wrap gap-2">
          {series.map((item) => {
            const hidden = hiddenKeys.includes(item.key);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleKey(item.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                  hidden
                    ? "border-[var(--md-outline-variant)]/40 bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface-variant)]"
                    : "border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)]"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color, opacity: hidden ? 0.35 : 1 }}
                />
                <span>{item.label}</span>
                <span className="rounded-full bg-[var(--md-surface-container-high)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--md-on-surface-variant)]">
                  {item.role === "OWN" ? "Own" : "Comp"}
                </span>
                {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Surface className="lg:col-span-2">
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">价格对比趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <AsinMultiLineChart data={priceTrend} series={series} hiddenKeys={hiddenKeys} format="currency" />
          </div>
        </Surface>

        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">评分趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <AsinMultiLineChart data={ratingTrend} series={series} hiddenKeys={hiddenKeys} format="decimal2" />
          </div>
        </Surface>

        <Surface>
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">评论量趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <AsinMultiLineChart data={reviewTrend} series={series} hiddenKeys={hiddenKeys} format="integer" />
          </div>
        </Surface>

        <Surface className="lg:col-span-2">
          <h3 className="font-headline text-lg font-semibold text-[var(--md-on-surface)]">BSR 对比趋势</h3>
          <div className="mt-6 rounded-xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <AsinMultiLineChart data={bsrTrend} series={series} hiddenKeys={hiddenKeys} format="integer" />
          </div>
        </Surface>
      </div>
    </div>
  );
}
