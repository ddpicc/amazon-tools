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

type MetricLineChartProps = {
  data: Array<{ label: string; value: number | null }>;
  color?: string;
  suffix?: string;
};

export function MetricLineChart({
  data,
  color = "#f59e0b",
  suffix = ""
}: MetricLineChartProps) {
  const normalized = useMemo(
    () => data.map((item) => ({ ...item, value: item.value ?? 0 })),
    [data]
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={normalized}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              borderColor: "#27272a",
              borderRadius: 12
            }}
            formatter={(value: number) => `${value}${suffix}`}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
