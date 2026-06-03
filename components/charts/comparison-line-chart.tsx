"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ComparisonLineChartProps = {
  data: Array<{ label: string; own: number | null; competitor: number | null }>;
  ownColor?: string;
  competitorColor?: string;
  suffix?: string;
};

export function ComparisonLineChart({
  data,
  ownColor = "#f59e0b",
  competitorColor = "#38bdf8",
  suffix = ""
}: ComparisonLineChartProps) {
  const normalized = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        own: item.own ?? 0,
        competitor: item.competitor ?? 0
      })),
    [data]
  );

  return (
    <div className="h-72 w-full">
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
            formatter={(value: number, name: string) => [`${value}${suffix}`, name === "own" ? "Own" : "Competitor"]}
          />
          <Legend formatter={(value) => (value === "own" ? "Own" : "Competitor")} />
          <Line type="monotone" dataKey="own" stroke={ownColor} strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="competitor" stroke={competitorColor} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
