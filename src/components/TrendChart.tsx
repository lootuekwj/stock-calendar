"use client";

import { useState, useMemo } from "react";
import { LineChart as RechartsLineChart, Line as RechartsLine, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid as RechartsCartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer as RechartsResponsiveContainer } from "recharts";
import { 
  format, eachDayOfInterval, startOfMonth, endOfMonth, subMonths, subYears 
} from "date-fns";
import type { SnapshotWithBrokers } from "@/types";
import { formatCurrency, formatCompact } from "@/lib/utils";

type Props = {
  snapshots: SnapshotWithBrokers[];
  selectedBrokers: string[];
  currentMonth: Date;
  calcMode: "asset" | "profit" | "total";
};

type TimeRange = 'calendar' | '1m' | '3m' | '6m' | '1y';

export default function TrendChart({ snapshots, selectedBrokers, currentMonth, calcMode }: Props) {
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
    const startStr = format(start, "yyyy-MM-dd");
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // 往回找上一個月份（或區間）的最後一筆紀錄
    const prevSnap = [...snapshots].reverse().find(s => s.snapshot_date < startStr);
    
    let prevUserAsset: number | null = null;
    let prevUserProfit: number | null = null;
    let prevUserTotal: number | null = null;
    
    if (prevSnap) {
      let a = 0; let p = 0; let t = 0;
      prevSnap.broker_snapshots?.forEach((bs: any) => {
        if (selectedBrokers.includes(bs.broker_id)) {
          const stock = Number(bs.amount || 0);
          const profit = Number(bs.profit || 0);
          const cash = Number(bs.cash_balance || 0);
          const settlement = Number(bs.settlement_amount || 0);
          a += stock;
          p += profit;
          t += (stock + cash + settlement);
        }
      });
      prevUserAsset = a;
      prevUserProfit = p;
      prevUserTotal = t;
    }

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");

      // 切除未來日期
      if (dateStr > todayStr) {
        return {
          date: dateStr,
          label: format(day, range === '1y' ? "MM/yy" : "M/d"),
          amount: null,
          userChange: null,
          userPct: null,
        };
      }

      const snap = snapshots.find(s => s.snapshot_date === dateStr);
      
      let currentAsset: number | null = null;
      let currentProfit: number | null = null;
      let currentTotal: number | null = null;

      if (snap) {
        let a = 0; let p = 0; let t = 0;
        snap.broker_snapshots?.forEach((bs: any) => {
          if (selectedBrokers.includes(bs.broker_id)) {
            const stock = Number(bs.amount || 0);
            const profit = Number(bs.profit || 0);
            const cash = Number(bs.cash_balance || 0);
            const settlement = Number(bs.settlement_amount || 0);
            a += stock;
            p += profit;
            t += (stock + cash + settlement);
          }
        });
        currentAsset = a;
        currentProfit = p;
        currentTotal = t;
      }

      let mainVal: number | null = null;
      let prevMainVal: number | null = null;
      if (calcMode === "asset") { mainVal = currentAsset; prevMainVal = prevUserAsset; }
      else if (calcMode === "profit") { mainVal = currentProfit; prevMainVal = prevUserProfit; }
      else if (calcMode === "total") { mainVal = currentTotal; prevMainVal = prevUserTotal; }

      let userChange = null;
      let userPct = null;
      if (mainVal !== null && prevMainVal !== null && prevMainVal !== 0) {
        userChange = mainVal - prevMainVal;
        userPct = userChange / Math.abs(prevMainVal);
      }

      if (currentAsset !== null) prevUserAsset = currentAsset;
      if (currentProfit !== null) prevUserProfit = currentProfit;
      if (currentTotal !== null) prevUserTotal = currentTotal;

      return {
        date: dateStr,
        label: format(day, range === '1y' ? "MM/yy" : "M/d"),
        amount: mainVal,
        userChange,
        userPct,
      };
    });
  }, [snapshots, selectedBrokers, currentMonth, range, calcMode]);

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
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-semibold text-gray-200">
                  {calcMode === "asset" ? "證券資產" : calcMode === "profit" ? "真實損益" : "總資產"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{formatCurrency(data.amount)}</div>
                {data.userChange !== null && (
                  <div className={`mt-0.5 flex flex-col text-[11px] font-medium leading-tight tracking-tight ${data.userChange > 0 ? "text-red-400" : data.userChange < 0 ? "text-green-400" : "text-gray-500"}`}>
                    <span>{data.userChange > 0 ? "+" : ""}{formatCompact(data.userChange)}</span>
                    {data.userPct !== null && (
                      <span className="opacity-90">({data.userPct > 0 ? "+" : ""}{(data.userPct * 100).toFixed(2)}%)</span>
                    )}
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
        <h3 className="text-sm font-semibold text-gray-100">
          {calcMode === "asset" ? "證券趨勢走勢" : calcMode === "profit" ? "損益趨勢走勢" : "總資產趨勢走勢"}
        </h3>
        
        <div className="flex overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
          {rangeButtons.map((btn) => (
            <button key={btn.id} onClick={() => setRange(btn.id)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${range === btn.id ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"}`}>{btn.label}</button>
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
            
            <RechartsLine 
              type="monotone" 
              dataKey="amount" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={range === '1y' || range === '6m' ? false : { r: 3, fill: "#111827", stroke: "#3b82f6", strokeWidth: 2 }} 
              activeDot={{ r: 6, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }} 
              connectNulls={true} 
            />
          </RechartsLineChart>
        </RechartsResponsiveContainer>
      </div>
    </section>
  );
}