import type { DayData } from "@/types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  if (num === 0) return "0";

  const absNum = Math.abs(num);

  // 1. 如果破億，切換成「億」單位，保留兩位小數 (例如 1.05億)
  if (absNum >= 100000000) {
    const yi = num / 100000000;
    // 如果剛好是整數億就不顯示小數點
    return Number.isInteger(yi) ? `${yi}億` : `${yi.toFixed(2)}億`;
  }

  // 2. 如果是大於等於 1000 萬，捨去小數點，保持畫面整潔 (例如 1052萬)
  if (absNum >= 10000000) {
    return `${(num / 10000).toFixed(0)}萬`;
  }

  // 3. 如果在 1萬 ~ 1000萬之間，顯示一位小數 (例如 658.8萬)
  if (absNum >= 10000) {
    const wan = num / 10000;
    return Number.isInteger(wan) ? `${wan}萬` : `${wan.toFixed(1)}萬`;
  }

  // 4. 一萬以內，直接顯示完整數字
  return num.toString();
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
