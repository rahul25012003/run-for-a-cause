"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#ED6C0F", "#2D6A4F", "#BF9000", "#A93D2C", "#857F77", "#52966E"];

interface CategoryPieProps {
  data: { name: string; value: number }[];
}

export function CategoryPie({ data }: CategoryPieProps): React.ReactNode {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          stroke="white"
          strokeWidth={3}
        >
          {data.map((_entry, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E8E2DA",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
