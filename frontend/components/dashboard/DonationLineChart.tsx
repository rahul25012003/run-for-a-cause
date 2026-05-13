"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DonationLineChartProps {
  data: { day: string; raised: number }[];
}

export function DonationLineChart({
  data,
}: DonationLineChartProps): React.ReactNode {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="dgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ED6C0F" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#ED6C0F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E8E2DA" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="#857F77"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#857F77"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 100000
              ? `₹${(v / 100000).toFixed(1)}L`
              : `₹${(v / 1000).toFixed(0)}K`
          }
        />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E8E2DA",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Raised"]}
        />
        <Area
          type="monotone"
          dataKey="raised"
          stroke="#ED6C0F"
          strokeWidth={2.5}
          fill="url(#dgrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
