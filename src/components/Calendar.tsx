"use client";

import { useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths
} from "date-fns";
import { zhTW } from "date-fns/locale";
import type { DayData, Broker, SnapshotWithBrokers } from "@/types";
import { formatCompact, getChangeColor, toDateString, formatCurrency } from "@/lib/utils";

type Props = {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  dayDataMap: Map<string, DayData>;
  snapshots: SnapshotWithBrokers[];
  brokers: Broker[];
  selectedBrokers: string[];
  calcMode: "asset" | "profit" | "total"; 
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const colorClasses = {
  up: "bg-red-950/40 text-red-400 border-red-900/50",
  down: "bg-green-950/40 text-green-400 border-green-900/50",
  neutral: "bg-gray-800/40 text-gray-400 border-gray-800",
};

const textColors = {
  up: "text-red-400",
  down: "text-green-400",
  neutral: "text-gray-500",
};

export default function Calendar({
  currentMonth, onMonthChange, dayDataMap, snapshots, brokers, selectedBrokers, calcMode
}: Props) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 0 }), end: endOfWeek(monthEnd, { weekStartsOn: 0 }) });

  const [activeTooltipDate, setActiveTooltipDate] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-2 shadow-sm sm:p-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">‹</button>
        <h2 className="text-base font-semibold text-gray-100">{format(currentMonth, "yyyy年 M月", { locale: zhTW })}</h2>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">›</button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => <div key={d} className="py-1 text-center text-xs font-medium text-gray-500">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = toDateString(day);
          const data = dayDataMap.get(dateStr);
          const inMonth = isSameMonth(day, currentMonth);
          const color = data ? getChangeColor(data.changeAmount) : "neutral";

          const currentIndex = snapshots.findIndex((s) => s.snapshot_date === dateStr);
          const dailySnapshot = currentIndex !== -1 ? snapshots[currentIndex] : null;
          const prevSnapshot = currentIndex > 0 ? snapshots[currentIndex - 1] : null;

          // 【修正1】：強制依照系統設定好的 brokers 順序來渲染，解決每天順序亂跳的問題
          const dayDetails: any[] = [];
          brokers.forEach((broker) => {
            if (!selectedBrokers.includes(broker.id)) return;
            
            const bs = dailySnapshot?.broker_snapshots?.find((snap: any) => snap.broker_id === broker.id);
            if (!bs) return;

            const prevBs = prevSnapshot?.broker_snapshots?.find((p: any) => p.broker_id === broker.id);
            
            const hasPrev = !!prevBs;
            const prevAsset = hasPrev ? Number(prevBs.amount || 0) : Number(bs.amount || 0);
            const currentAsset = Number(bs.amount || 0);
            
            const prevProfit = hasPrev ? Number(prevBs.profit || 0) : Number(bs.profit || 0);
            const currentProfit = Number(bs.profit || 0);
            
            const currentCash = Number(bs.cash_balance || 0);
            const currentSettlement = Number(bs.settlement_amount || 0);
            const prevCash = hasPrev ? Number(prevBs.cash_balance || 0) : currentCash;
            const prevSettlement = hasPrev ? Number(prevBs.settlement_amount || 0) : currentSettlement;

            const currentTotal = currentAsset + currentCash + currentSettlement;
            const prevTotal = prevAsset + prevCash + prevSettlement;

            const dailyAssetChange = currentAsset - prevAsset;
            const dailyProfitChange = currentProfit - prevProfit;
            const dailyTotalChange = currentTotal - prevTotal;

            const dailyAssetPercent = (hasPrev && prevAsset !== 0) ? (dailyAssetChange / Math.abs(prevAsset)) : 0;
            const dailyProfitPercent = (hasPrev && prevProfit !== 0) ? (dailyProfitChange / Math.abs(prevProfit)) : 0;
            const dailyTotalPercent = (hasPrev && prevTotal !== 0) ? (dailyTotalChange / Math.abs(prevTotal)) : 0;
            
            const cashLevelPercent = currentTotal !== 0 ? ((currentCash + currentSettlement) / currentTotal) * 100 : 0;

            dayDetails.push({
              name: broker.name,
              amount: currentAsset,
              profit: currentProfit,
              total: currentTotal,
              // 【修正2】：畫面上的現金明確加上交割款，讓記帳邏輯無縫對接
              cash: currentCash + currentSettlement,
              cashLevelPercent,
              dailyAssetChange,
              dailyProfitChange,
              dailyTotalChange,
              dailyAssetPercent,
              dailyProfitPercent,
              dailyTotalPercent
            });
          });

          const isTooltipActive = activeTooltipDate === dateStr;

          return (
            <div
              key={dateStr}
              onClick={() => setActiveTooltipDate((isTooltipActive || !inMonth || (!dayDetails.length && !dailySnapshot?.note)) ? null : dateStr)}
              className={`group relative min-h-[5.2rem] cursor-pointer rounded-lg border px-0.5 py-1 transition sm:min-h-[6rem] sm:p-1.5 ${inMonth ? colorClasses[color] : "border-transparent opacity-10"}`}
            >
              <div className="text-xs font-medium text-gray-300 px-0.5">{format(day, "d")}</div>
              
              {data && inMonth && (
                <div className="mt-0.5 flex flex-col px-0.5">
                  <div className="whitespace-nowrap text-[9px] font-semibold leading-tight tracking-tighter sm:text-xs text-gray-100">
                    {calcMode === "profit" && data.amount > 0 ? "+" : ""}{formatCompact(data.amount)}
                  </div>
                  
                  {data.changeAmount !== null && (
                    <>
                      <div className={`whitespace-nowrap text-[8px] leading-tight tracking-tighter sm:text-[10px] ${textColors[color]}`}>
                        {data.changeAmount > 0 ? "+" : ""}{formatCompact(data.changeAmount)}
                      </div>
                      {(calcMode === "asset" || calcMode === "total") && data.changePercent !== null && (
                        <div className={`whitespace-nowrap text-[8px] leading-tight tracking-tighter sm:text-[10px] opacity-85 ${textColors[color]}`}>
                          ({data.changePercent > 0 ? "+" : ""}{(data.changePercent * 100).toFixed(2)}%)
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {inMonth && (dayDetails.length > 0 || dailySnapshot?.note) && (
                <div className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 flex-col rounded-xl border border-gray-700 bg-gray-950 p-3 text-gray-100 shadow-2xl transition-all sm:w-72 ${isTooltipActive ? "flex opacity-100" : "hidden group-hover:flex group-hover:opacity-100"}`}>
                  <div className="mb-2 flex items-center justify-between border-b border-gray-800 pb-1.5 text-xs text-gray-400">
                    <span>{format(day, "MM月dd日")}</span>
                    <span>{calcMode === "asset" ? "證券明細" : calcMode === "profit" ? "損益明細" : "總資產明細"}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {dayDetails.map((d) => {
                      const isAssetMode = calcMode === "asset";
                      const isTotalMode = calcMode === "total";
                      
                      const mainValue = isAssetMode ? d.amount : isTotalMode ? d.total : d.profit;
                      const changeValue = isAssetMode ? d.dailyAssetChange : isTotalMode ? d.dailyTotalChange : d.dailyProfitChange;
                      const percentValue = isAssetMode ? d.dailyAssetPercent : isTotalMode ? d.dailyTotalPercent : d.dailyProfitPercent;
                      
                      const isPositive = changeValue > 0;
                      const isNegative = changeValue < 0;

                      return (
                        <div key={d.name} className="flex flex-col rounded border border-gray-800 bg-gray-900 p-2">
                          <div className="mb-1 flex justify-between text-xs text-gray-400">
                            <span className="font-medium">{d.name}</span>
                          </div>
                          
                          <div className="flex items-end justify-between">
                            <span className="text-sm font-semibold text-white">
                              {calcMode === "profit" && mainValue > 0 ? "+" : ""}{formatCurrency(mainValue)}
                            </span>
                            <span className={`text-[10px] font-medium ${isPositive ? "text-red-400" : isNegative ? "text-green-400" : "text-gray-500"}`}>
                              {isPositive ? "+" : ""}{formatCompact(changeValue)}
                              {(isAssetMode || isTotalMode) && (
                                <> ({isPositive ? "+" : ""}{(percentValue * 100).toFixed(2)}%)</>
                              )}
                            </span>
                          </div>
                          
                          {isTotalMode && (
                            <div className="mt-1.5 border-t border-gray-800/60 pt-1 flex justify-between text-[10px] text-gray-400">
                              <span>證券: {formatCompact(d.amount)}</span>
                              <span>現金: {formatCompact(d.cash)} (水位: {d.cashLevelPercent.toFixed(1)}%)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {dailySnapshot?.note && (
                    <div className="mt-3 border-t border-gray-800 pt-2 text-[11px] leading-relaxed text-gray-400">
                      📝 {dailySnapshot.note}
                    </div>
                  )}

                  <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-700 bg-gray-950"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}