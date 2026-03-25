"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PricePoint {
  month: string;
  avg: number;
  min: number;
  max: number;
}

interface PriceTrendChartProps {
  data: PricePoint[];
  unit: string;
  title?: string;
}

function formatCurrency(val: number) {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatMonth(month: string) {
  const [y, m] = month.split("-");
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

export default function PriceTrendChart({ data, unit, title }: PriceTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center text-gray-400">
        Trend verisi bulunmuyor
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      {title && <h3 className="font-semibold text-gray-900 mb-4 text-sm">{title}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            width={65}
          />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
            formatter={(value: unknown, name: unknown) => [
              `${formatCurrency(Number(value))} ₺/${unit}`,
              name === "avg" ? "Ortalama" : name === "min" ? "Minimum" : "Maksimum",
            ]}
            labelFormatter={(label: unknown) => formatMonth(String(label))}
          />
          <Area type="monotone" dataKey="max" stroke="#cbd5e1" fill="url(#rangeGradient)" strokeWidth={1} dot={false} />
          <Area type="monotone" dataKey="avg" stroke="#3b82f6" fill="url(#avgGradient)" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
          <Area type="monotone" dataKey="min" stroke="#cbd5e1" fill="none" strokeWidth={1} strokeDasharray="4 4" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
