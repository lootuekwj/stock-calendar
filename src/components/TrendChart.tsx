"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { 
  format, eachDayOfInterval, startOfMonth, endOfMonth, subMonths, subYears 
} from "date-fns";
import type { DayData } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  dayDataMap: Map<string, DayData>;
  currentMonth: Date;
  calcMode: "asset" | "profit"; // 新增模式接收
};

type TimeRange = 'calendar' | '1m' | '3m' | '6m' | '1y';

export default function TrendChart({ dayDataMap, currentMonth, calcMode }: Props) {
  const [range, setRange] = useState<TimeRange>('calendar');

  const chartData = useMemo(() => {
    let start: Date;
    let end: Date = new Date();

    if (range === 'calendar') {
      start = startOfMonth(currentMonth);
      end = endOfMonth(currentMonth);
    } else if (range === '1m') {
      start = subMonths(new Date(), 1);
    } else if (range === '3m') {
      start = subMonths(new Date(), 3);
    } else if (range === '6m') {
      start = subMonths(new Date(), 6);
    } else if (range === '1y') {
      start = subYears(new Date(), 1);
    } else {
      start = startOfMonth(currentMonth);
    }

    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const existingData = dayDataMap.get(dateStr);
      
      return {
        date: dateStr,
        label: format(day, range === '1y' ? "MM/yy" : "M/d"),
        amount: existingData ? existingData.amount : (null as any),
      };
    });
  }, [dayDataMap, currentMonth, range]);

  const rangeButtons: { id: TimeRange; label: string }[] = [
    { id: 'calendar', label: '本月' },
    { id: '1m', label: '1個月' },
    { id: '3m', label: '3個月' },
    { id: '6m', label: '半年' },
    { id: '1y', label: '1年' },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="text-sm font-semibold text-gray-900">
          {calcMode === "asset" ? "資產趨勢走勢" : "損益趨勢走勢"}
        </h3>
        
        <div className="flex overflow-hidden rounded-lg border border-border bg-gray-50">
          {rangeButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setRange(btn.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                range === btn.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} minTickGap={20} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 10000 || v <= -10000 ? `${(v / 10000).toFixed(0)}w` : String(v)} />
            
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "13px", fontWeight: 500 }}
              formatter={(value: number) => [
                <span key="val" className="font-bold text-primary">{formatCurrency(value)}</span>, 
                calcMode === "asset" ? "資產總額" : "損益總額"
              ]}
              labelFormatter={(label, payload) => {
                const fullDate = payload?.[0]?.payload?.date;
                return fullDate ? `日期：${fullDate}` : label;
              }}
            />
            
            <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} dot={range === '1y' || range === '6m' ? false : { r: 3, fill: "#fff", stroke: "#2563eb", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} connectNulls={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}