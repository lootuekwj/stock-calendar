import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// 千萬資產升級版：動態小數點，防止破版
export function formatCompact(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  if (num === 0) return "0";

  const absNum = Math.abs(num);

  if (absNum >= 100000000) {
    const yi = num / 100000000;
    return Number.isInteger(yi) ? `${yi}億` : `${yi.toFixed(2)}億`;
  }
  if (absNum >= 10000000) {
    return `${(num / 10000).toFixed(0)}萬`;
  }
  if (absNum >= 10000) {
    const wan = num / 10000;
    return Number.isInteger(wan) ? `${wan}萬` : `${wan.toFixed(1)}萬`;
  }
  return num.toString();
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getChangeColor(change: number | null): "up" | "down" | "neutral" {
  if (change === null || change === 0) return "neutral";
  return change > 0 ? "up" : "down";
}

// 核心：計算每日增減金額與百分比 (%)
export function computeDayChanges(entries: { date: string; amount: number }[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result: { date: string; amount: number; changeAmount: number | null; changePercent: number | null }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (i === 0) {
      result.push({ ...current, changeAmount: null, changePercent: null });
    } else {
      const prev = sorted[i - 1];
      const changeAmount = current.amount - prev.amount;
      // 防止除以零：如果前一天是 0，百分比設為 0
      const changePercent = prev.amount !== 0 ? changeAmount / Math.abs(prev.amount) : 0;
      
      result.push({ ...current, changeAmount, changePercent });
    }
  }
  return result;
}