"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RegionalPoint {
  city: string;
  avg: number;
  min: number;
  max: number;
  sampleCount: number;
}

interface RegionalBarChartProps {
  data: RegionalPoint[];
  unit: string;
  title?: string;
}

const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff", "#f3e8ff"];

function formatCurrency(val: number) {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function RegionalBarChart({ data, unit, title }: RegionalBarChartProps) {
  const sorted = [...data].sort((a, b) => b.avg - a.avg);

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center text-gray-400">
        Bölgesel veri bulunmuyor
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      {title && <h3 className="font-semibold text-gray-900 mb-4 text-sm">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sorted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            type="category"
            dataKey="city"
            tick={{ fontSize: 12, fill: "#374151" }}
            axisLine={{ stroke: "#e2e8f0" }}
            width={80}
          />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
            formatter={(value: unknown) => [`${formatCurrency(Number(value))} ₺/${unit}`, "Ortalama"]}
          />
          <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={24}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
