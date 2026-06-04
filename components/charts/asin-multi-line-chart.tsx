"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type AsinSeries = {
  key: string;
  label: string;
  role: "OWN" | "COMPETITOR";
  color: string;
};

type AsinMultiLineChartProps = {
  data: Array<Record<string, string | number | null>>;
  series: AsinSeries[];
  hiddenKeys?: string[];
  format?: "currency" | "decimal2" | "integer";
};

export function AsinMultiLineChart({
  data,
  series,
  hiddenKeys = [],
  format = "integer"
}: AsinMultiLineChartProps) {
  const visibleSeries = useMemo(
    () => series.filter((item) => !hiddenKeys.includes(item.key)),
    [hiddenKeys, series]
  );

  const seriesByKey = useMemo(
    () => new Map(series.map((item) => [item.key, item])),
    [series]
  );

  function formatValue(value: number) {
    if (format === "currency") {
      return `$${value.toFixed(2)}`;
    }

    if (format === "decimal2") {
      return value.toFixed(2);
    }

    return value.toFixed(0);
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              borderColor: "#27272a",
              borderRadius: 12
            }}
            formatter={(value: number | string | Array<string | number> | null, name: string) => {
              if (typeof value !== "number") {
                return ["-", seriesByKey.get(name)?.label ?? name];
              }

              return [formatValue(value), seriesByKey.get(name)?.label ?? name];
            }}
          />
          {visibleSeries.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
