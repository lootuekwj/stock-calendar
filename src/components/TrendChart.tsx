"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
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

// 【模擬器】產生有波動的 0050 模擬報價 (未來可換成連接資料庫)
function getMock0050Price(dateStr: string) {
  const date = new Date(dateStr);
  const timeOffset = Math.floor(date.getTime() / 86400000);
  // 基礎價格 180，加上穩健上升趨勢，與基於日期的正弦波震盪
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
    
    // 尋找此區間內的第一筆「真實有記帳」的資料，作為平行時空的起點
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

    // 計算虛擬本金在起點時，可以買入的 0050 單位數
    const base0050Price = baseDateStr ? getMock0050Price(baseDateStr) : 1;
    const virtualShares = baseUserAmount / base0050Price;

    // 儲存前一天的數值，用來計算單日增減 %
    let prevUserAmount: number | null = null;
    let prevBenchAmount: number | null = null;

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const existingData = dayDataMap.get(dateStr);
      const userAmount = existingData ? existingData.amount : null;

      // 1. 計算使用者真實數據的單日 % 數
      let userChange = null;
      let userPct = null;
      if (userAmount !== null && prevUserAmount !== null && prevUserAmount !== 0) {
        userChange = userAmount - prevUserAmount;
        userPct = userChange / Math.abs(prevUserAmount);
      }
      if (userAmount !== null) prevUserAmount = userAmount;

      // 2. 計算 0050 平行時空的數據
      const current0050Price = getMock0050Price(dateStr);
      // 只有在已經有起點資金後，才開始畫大盤對照線
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

  // 客製化 Tooltip：顯示真實資產與 0050 虛擬資產，並加上單日增減 % 數
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-gray-700 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm">
          <p className="mb-2 border-b border-gray-800 pb-1 text-xs text-gray-400">日期：{data.date}</p>
          
          {/* 真實資產線 (藍色) */}
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
                {data.userPct !== null && (
                  <div className={`text-[10px] ${data.userPct > 0 ? "text-red-400" : data.userPct < 0 ? "text-green-400" : "text-gray-500"}`}>
                    {data.userChange > 0 ? "+" : ""}{formatCompact(data.userChange)} ({data.userPct > 0 ? "+" : ""}{(data.userPct * 100).toFixed(2)}%)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 0050 對照線 (灰色虛線) */}
          {data.benchAmount !== null && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                <span className="text-sm font-semibold text-gray-400">0050 對照</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-300">{formatCurrency(data.benchAmount)}</div>
                {data.benchPct !== null && (
                  <div className={`text-[10px] ${data.benchPct > 0 ? "text-red-400/80" : data.benchPct < 0 ? "text-green-400/80" : "text-gray-500"}`}>
                    {data.benchChange > 0 ? "+" : ""}{formatCompact(data.benchChange)} ({data.benchPct > 0 ? "+" : ""}{(data.benchPct * 100).toFixed(2)}%)
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
          <span className="text-[10px] text-gray-500">包含 0050 虛擬本金對照線</span>
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#4b5563" }} minTickGap={20} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 10000 || v <= -10000 ? `${(v / 10000).toFixed(0)}w` : String(v)} />
            
            {/* 載入我們精心設計的 Custom Tooltip */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* 0050 虛擬本金平行對照線 (置於底層，使用灰色虛線表示對照基準) */}
            <Line type="monotone" dataKey="benchAmount" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: "#6b7280", stroke: "#111827", strokeWidth: 2 }} connectNulls={true} />
            
            {/* 真實資產線 (置於上層，亮藍色) */}
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={range === '1y' || range === '6m' ? false : { r: 3, fill: "#111827", stroke: "#3b82f6", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }} connectNulls={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}