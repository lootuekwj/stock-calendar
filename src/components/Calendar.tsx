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
  calcMode: "asset" | "profit"; 
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const colorClasses = {
  up: "bg-red-950/40 text-red-400 border-red-900/50",
  down: "bg-green-950/40 text-green-400 border-green-900/50",
  neutral: "bg-gray-800/40 text-gray-400 border-gray-800",
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

          const dayDetails = dailySnapshot?.broker_snapshots
            ?.filter((bs) => selectedBrokers.includes(bs.broker_id))
            .map((bs) => {
              const broker = brokers.find((b) => b.id === bs.broker_id);
              const prevBs = prevSnapshot?.broker_snapshots?.find((p) => p.broker_id === bs.broker_id);
              
              const dailyAssetChange = Number(bs.amount || 0) - Number(prevBs?.amount || 0);
              const dailyProfitChange = Number(bs.profit || 0) - Number(prevBs?.profit || 0);

              return {
                name: broker?.name || "未知券商",
                amount: Number(bs.amount || 0),
                profit: Number(bs.profit || 0),
                dailyAssetChange,
                dailyProfitChange
              };
            }) || [];

          const isTooltipActive = activeTooltipDate === dateStr;

          return (
            <div
              key={dateStr}
              onClick={() => setActiveTooltipDate((isTooltipActive || !inMonth || (!dayDetails.length && !dailySnapshot?.note)) ? null : dateStr)}
              /* 縮小手機版的 px 內距，爭取更多顯示空間 */
              className={`group relative min-h-[4.5rem] cursor-pointer rounded-lg border px-0.5 py-1 transition sm:min-h-[5.5rem] sm:p-1.5 ${inMonth ? colorClasses[color] : "border-transparent opacity-10"}`}
            >
              <div className="text-xs font-medium text-gray-300 px-0.5">{format(day, "d")}</div>
              
              {data && inMonth && (
                <div className="mt-0.5 space-y-0.5 px-0.5">
                  {/* 移除 truncate，改用 text-[9px] 與更緊湊的 tracking-tighter */}
                  <div className="whitespace-nowrap text-[9px] font-semibold leading-tight tracking-tighter sm:text-xs">
                    {calcMode === "profit" && data.amount > 0 ? "+" : ""}{formatCompact(data.amount)}
                  </div>
                  {data.changeAmount !== null && (
                    <div className="whitespace-nowrap text-[8px] leading-tight tracking-tighter sm:text-[10px]">
                      {data.changeAmount > 0 ? "+" : ""}{formatCompact(data.changeAmount)}
                    </div>
                  )}
                </div>
              )}

              {inMonth && (dayDetails.length > 0 || dailySnapshot?.note) && (
                <div className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 flex-col rounded-xl border border-gray-700 bg-gray-950 p-3 text-gray-100 shadow-2xl transition-all sm:w-64 ${isTooltipActive ? "flex opacity-100" : "hidden group-hover:flex group-hover:opacity-100"}`}>
                  <div className="mb-2 flex items-center justify-between border-b border-gray-800 pb-1.5 text-xs text-gray-400">
                    <span>{format(day, "MM月dd日")}</span>
                    <span>{calcMode === "asset" ? "資產明細" : "損益明細"}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {dayDetails.map((d) => {
                      const isAssetMode = calcMode === "asset";
                      const mainValue = isAssetMode ? d.amount : d.profit;
                      const changeValue = isAssetMode ? d.dailyAssetChange : d.dailyProfitChange;
                      
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
                            <span className={`text-xs font-medium ${isPositive ? "text-red-400" : isNegative ? "text-green-400" : "text-gray-500"}`}>
                              {isPositive ? "+" : ""}{formatCurrency(changeValue)}
                            </span>
                          </div>
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