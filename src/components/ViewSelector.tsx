"use client";

import type { Broker, ViewMode } from "@/types";

type Props = {
  viewMode: ViewMode;
  brokers: Broker[];
  onChange: (mode: ViewMode) => void;
};

export default function ViewSelector({ viewMode, brokers, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="view-select" className="shrink-0 text-sm font-medium text-gray-700">
        檢視
      </label>
      <select
        id="view-select"
        value={viewMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="total">總資產</option>
        {brokers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
