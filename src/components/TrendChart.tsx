"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DayData } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  data: DayData[];
};

export default function TrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">資產趨勢</h3>
        <p className="text-center text-sm text-muted py-8">
          尚無資料，點擊右上角 + 開始記錄
        </p>
      </section>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "M/d"),
  }));

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">資產趨勢</h3>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 10000 ? `${(v / 10000).toFixed(0)}萬` : String(v)
              }
              width={48}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                fontSize: "13px",
              }}
              formatter={(value: number) => [formatCurrency(value), "資產"]}
              labelFormatter={(label) => `日期：${label}`}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: "#2563eb" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
