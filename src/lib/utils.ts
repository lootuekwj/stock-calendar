import type { DayData } from "@/types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}萬`;
  }
  return value.toLocaleString("zh-TW");
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function computeDayChanges(
  entries: { date: string; amount: number }[]
): DayData[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((entry, index) => {
    const prev = index > 0 ? sorted[index - 1].amount : null;
    const changeAmount = prev !== null ? entry.amount - prev : null;
    const changePercent =
      prev !== null && prev !== 0
        ? ((entry.amount - prev) / prev) * 100
        : null;

    return {
      date: entry.date,
      amount: entry.amount,
      changeAmount,
      changePercent,
    };
  });
}

export function getChangeColor(
  change: number | null
): "up" | "down" | "neutral" {
  if (change === null || change === 0) return "neutral";
  return change > 0 ? "up" : "down";
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
