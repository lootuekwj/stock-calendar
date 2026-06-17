"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  format, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  subYears, 
  isSameMonth
} from "date-fns";
import type { DayData } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  dayDataMap: Map<string, DayData>;
  currentMonth: Date; // 接收來自 Calendar 的目前月份
};

type TimeRange = 'calendar' | '1m' | '3m' | '6m' | '1y';

export default function TrendChart({ dayDataMap, currentMonth }: Props) {
  // 預設跟著行事曆
  const [range, setRange] = useState<TimeRange>('calendar');

  const chartData = useMemo(() => {
    let start: Date;
    let end: Date = new Date(); // 預設結束在今天

    // 根據按鈕計算區間的起始與結束日
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

    // 產生這段區間內的「每一天」 (解決只顯示兩天的問題)
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const existingData = dayDataMap.get(dateStr);
      
      return {
        date: dateStr,
        label: format(day, range === '1y' ? "MM/yy" : "M/d"),
        // 如果當天沒資料，塞入 null，這樣折線圖才會在空白處斷開或連接
        amount: existingData && existingData.amount > 0 ? existingData.amount : (null as any),
      };
    });
  }, [dayDataMap, currentMonth, range]);

  // 定義時間切換按鈕
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
          資產趨勢走勢
        </h3>
        
        {/* 時間區間切換按鈕 */}
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
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              minTickGap={20} // 防止標籤黏在一起
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}w` : String(v)}
            />
            
            {/* 進階版 Tooltip：游標滑過去會浮出漂亮資訊 */}
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                fontSize: "13px",
                fontWeight: 500,
              }}
              formatter={(value: number) => [
                <span key="val" className="font-bold text-primary">{formatCurrency(value)}</span>, 
                "資產總額"
              ]}
              labelFormatter={(label, payload) => {
                const fullDate = payload?.[0]?.payload?.date;
                return fullDate ? `日期：${fullDate}` : label;
              }}
            />
            
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={3}
              dot={range === '1y' || range === '6m' ? false : { r: 3, fill: "#fff", stroke: "#2563eb", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
              // connectNulls 是靈魂！就算你只輸入 16 號跟 17 號，線也會自動連起來，不會斷掉
              connectNulls={true} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}