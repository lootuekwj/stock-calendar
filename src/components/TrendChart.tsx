"use client";

import { useState, useMemo } from "react";
import { LineChart as RechartsLineChart, Line as RechartsLine, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid as RechartsCartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer as RechartsResponsiveContainer } from "recharts";
import { 
  format, eachDayOfInterval, startOfMonth, endOfMonth, subMonths, subYears 
} from "date-fns";
import type { DayData } from "@/types";
import { formatCurrency, formatCompact } from "@/lib/utils";

type Props = {
  dayDataMap: Map<string, DayData>;
  currentMonth: Date;
  calcMode: "asset" | "profit"; 
};

type TimeRange = 'calendar' | '1m' | '3m' | '6m' | '1y';

function getMock0050Price(dateStr: string) {
  const date = new Date(dateStr);
  const timeOffset = Math.floor(date.getTime() / 86400000);
  return 180 + (timeOffset - 19800) * 0.05 + Math.sin(timeOffset * 0.2) * 5;
}

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
    
    let baseDateStr = "";
    let baseUserAmount = 0;
    for (const day of days) {
      const dStr = format(day, "yyyy-MM-dd");
      const dData = dayDataMap.get(dStr);
      if (dData && dData.amount !== null && dData.amount !== 0) {
        baseDateStr = dStr;
        baseUserAmount = dData.amount;
        break;
      }
    }

    const base0050Price = baseDateStr ? getMock0050Price(baseDateStr) : 1;
    const virtualShares = baseUserAmount / base0050Price;

    let prevUserAmount: number | null = null;
    let prevBenchAmount: number | null = null;

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const existingData = dayDataMap.get(dateStr);
      const userAmount = existingData ? existingData.amount : null;

      let userChange = null;
      let userPct = null;
      if (userAmount !== null && prevUserAmount !== null && prevUserAmount !== 0) {
        userChange = userAmount - prevUserAmount;
        userPct = userChange / Math.abs(prevUserAmount);
      }
      if (userAmount !== null) prevUserAmount = userAmount;

      const current0050Price = getMock0050Price(dateStr);
      const benchAmount = baseUserAmount !== 0 ? (virtualShares * current0050Price) : null;

      let benchChange = null;
      let benchPct = null;
      if (benchAmount !== null && prevBenchAmount !== null && prevBenchAmount !== 0) {
        benchChange = benchAmount - prevBenchAmount;
        benchPct = benchChange / Math.abs(prevBenchAmount);
      }
      if (benchAmount !== null) prevBenchAmount = benchAmount;
      
      return {
        date: dateStr,
        label: format(day, range === '1y' ? "MM/yy" : "M/d"),
        amount: userAmount,
        userChange,
        userPct,
        benchAmount,
        benchChange,
        benchPct
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm">
          <p className="mb-2 border-b border-gray-800 pb-1 text-xs text-gray-400">日期：{data.date}</p>
          
          {data.amount !== null && (
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-semibold text-gray-200">
                  {calcMode === "asset" ? "真實資產" : "真實損益"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{formatCurrency(data.amount)}</div>
                {data.userChange !== null && (
                  <div className={`text-[10px] ${data.userChange > 0 ? "text-red-400" : data.userChange < 0 ? "text-green-400" : "text-gray-500"}`}>
                    {data.userChange > 0 ? "+" : ""}{formatCompact(data.userChange)}
                    {/* 核心修正：圖表浮動框的 % 數也限制在資產模式才顯示 */}
                    {calcMode === "asset" && data.userPct !== null && ` (${data.userPct > 0 ? "+" : ""}{(data.userPct * 100).toFixed(2)}%)`}
                  </div>
                )}
              </div>
            </div>
          )}

          {calcMode === "profit" && data.benchAmount !== null && (
            <div className="flex items-center justify-between gap-4 border-t border-gray-800/60 mt-1.5 pt-1.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                <span className="text-sm font-semibold text-gray-400">0050 對照</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-300">{formatCurrency(data.benchAmount)}</div>
                {data.benchChange !== null && (
                  <div className={`text-[10px] ${data.benchChange > 0 ? "text-red-400/80" : data.benchChange < 0 ? "text-green-400/80" : "text-gray-500"}`}>
                    {data.benchChange > 0 ? "+" : ""}{formatCompact(data.benchChange)}
                    {/* 損益模式不顯示百分比，保留純絕對金額對比 */}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-gray-100">
            {calcMode === "asset" ? "資產趨勢走勢" : "損益趨勢走勢"}
          </h3>
          {calcMode === "profit" && <span className="text-[10px] text-gray-500">包含 0050 虛擬本金對照線</span>}
        </div>
        
        <div className="flex overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
          {rangeButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setRange(btn.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                range === btn.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full sm:h-72">
        <RechartsResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <RechartsCartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#4b5563" }} minTickGap={20} />
            <RechartsYAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 10000 || v <= -10000 ? `${(v / 10000).toFixed(0)}w` : String(v)} />
            
            <RechartsTooltip content={<CustomTooltip />} />
            
            {calcMode === "profit" && (
              <RechartsLine type="monotone" dataKey="benchAmount" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: "#6b7280", stroke: "#111827", strokeWidth: 2 }} connectNulls={true} />
            )}
            
            <RechartsLine type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={range === '1y' || range === '6m' ? false : { r: 3, fill: "#111827", stroke: "#3b82f6", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }} connectNulls={true} />
          </RechartsLineChart>
        </RechartsResponsiveContainer>
      </div>
    </section>
  );
}