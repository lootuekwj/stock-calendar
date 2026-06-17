"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import type { DayData, Broker, SnapshotWithBrokers } from "@/types";
import { 
  formatCompact, 
  formatPercent, 
  getChangeColor, 
  toDateString,
  formatCurrency // 引入這個來格式化浮動卡片裡的金額
} from "@/lib/utils";

type Props = {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  dayDataMap: Map<string, DayData>;
  // 新增以下三個屬性，接收來自大腦的明細資料
  snapshots: SnapshotWithBrokers[];
  brokers: Broker[];
  selectedBrokers: string[];
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const colorClasses = {
  up: "bg-up-bg text-up border-up/20",
  down: "bg-down-bg text-down border-down/20",
  neutral: "bg-neutral-bg text-gray-600 border-gray-200",
};

export default function Calendar({
  currentMonth,
  onMonthChange,
  dayDataMap,
  snapshots,
  brokers,
  selectedBrokers,
}: Props) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
          aria-label="上個月"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {format(currentMonth, "yyyy年 M月", { locale: zhTW })}
        </h2>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
          aria-label="下個月"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium text-muted"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = toDateString(day);
          const data = dayDataMap.get(dateStr);
          const inMonth = isSameMonth(day, currentMonth);
          const color = data ? getChangeColor(data.changeAmount) : "neutral";

          // 整理當天游標懸停要顯示的券商明細
          const dailySnapshot = snapshots.find((s) => s.snapshot_date === dateStr);
          const dayDetails = dailySnapshot?.broker_snapshots
            ?.filter((bs) => selectedBrokers.includes(bs.broker_id))
            .map((bs) => {
              const broker = brokers.find((b) => b.id === bs.broker_id);
              return {
                name: broker?.name || "未知券商",
                amount: Number(bs.amount),
              };
            }) || [];

          return (
            <div
              key={dateStr}
              // 加入 group 類別，讓 Tailwind 知道這是觸發 Hover 的區塊
              className={`group relative min-h-[4.5rem] rounded-lg border p-1 transition sm:min-h-[5.5rem] sm:p-1.5 ${
                inMonth ? colorClasses[color] : "border-transparent opacity-30"
              }`}
            >
              <div className="text-xs font-medium text-gray-700">
                {format(day, "d")}
              </div>
              {data && inMonth && (
                <div className="mt-0.5 space-y-0.5">
                  <div className="text-[10px] font-semibold leading-tight sm:text-xs">
                    {formatCompact(data.amount)}
                  </div>
                  {data.changeAmount !== null && (
                    <>
                      <div className="text-[9px] leading-tight sm:text-[10px]">
                        {data.changeAmount > 0 ? "+" : ""}
                        {formatCompact(data.changeAmount)}
                      </div>
                      {data.changePercent !== null && (
                        <div className="text-[9px] leading-tight sm:text-[10px]">
                          {formatPercent(data.changePercent)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 隱藏的 Tooltip 浮動資訊卡 */}
              {inMonth && dayDetails.length > 0 && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 flex-col rounded-xl border border-gray-700 bg-gray-900 p-3 text-white opacity-0 shadow-xl transition-all group-hover:flex group-hover:opacity-100 sm:w-56">
                  <div className="mb-2 border-b border-gray-700 pb-1.5 text-xs text-gray-400">
                    {format(day, "yyyy年MM月dd日")} 資產明細
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {dayDetails.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">{d.name}</span>
                        <span className="font-semibold tracking-wide text-white">
                          {formatCurrency(d.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* 向下的小箭頭 */}
                  <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-700 bg-gray-900"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}