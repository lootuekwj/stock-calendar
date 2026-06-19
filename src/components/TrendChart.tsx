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
                {data.userPct !== null && (
                  <div className={`text-[10px] ${data.userPct > 0 ? "text-red-400" : data.userPct < 0 ? "text-green-400" : "text-gray-500"}`}>
                    {data