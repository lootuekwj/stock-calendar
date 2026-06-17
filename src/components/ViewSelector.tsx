"use client";

import type { Broker } from "@/types";

type Props = {
  brokers: Broker[];
  selectedBrokers: string[];
  onChange: (selected: string[]) => void;
};

export default function ViewSelector({ brokers, selectedBrokers, onChange }: Props) {
  const toggleAll = () => {
    if (selectedBrokers.length === brokers.length) {
      onChange([]); // 全部取消
    } else {
      onChange(brokers.map((b) => b.id)); // 全選
    }
  };

  const toggleBroker = (id: string) => {
    if (selectedBrokers.includes(id)) {
      onChange(selectedBrokers.filter((bId) => bId !== id));
    } else {
      onChange([...selectedBrokers, id]);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">選擇顯示券商</h3>
        <button
          onClick={toggleAll}
          className="text-xs font-medium text-primary hover:text-primary-hover"
        >
          {selectedBrokers.length === brokers.length ? "取消全選" : "全選"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {brokers.map((broker) => {
          const isSelected = selectedBrokers.includes(broker.id);
          return (
            <button
              key={broker.id}
              onClick={() => toggleBroker(broker.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {/* 自訂打勾圖示 */}
              <div className={`flex h-4 w-4 items-center justify-center rounded ${isSelected ? 'bg-primary text-white' : 'border border-gray-300'}`}>
                {isSelected && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {broker.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}