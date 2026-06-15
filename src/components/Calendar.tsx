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
import type { DayData } from "@/types";
import { formatCompact, formatPercent, getChangeColor, toDateString } from "@/lib/utils";

type Props = {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  dayDataMap: Map<string, DayData>;
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
          const color = data
            ? getChangeColor(data.changeAmount)
            : "neutral";

          return (
            <div
              key={dateStr}
              className={`min-h-[4.5rem] rounded-lg border p-1 transition sm:min-h-[5.5rem] sm:p-1.5 ${
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
