"use client";

import type { Broker } from "@/types";

type Props = {
  brokers: Broker[];
  selectedBrokers: string[];
  onChange: (selected: string[]) => void;
};

export default function ViewSelector({ brokers, selectedBrokers, onChange }: Props) {
  if (brokers.length === 0) return null;

  const isAllSelected = selectedBrokers.length === brokers.length;

  const toggleAll = () => {
    if (isAllSelected) {
      onChange([brokers[0].id]); // 如果全選，預設退回只選第一個
    } else {
      onChange(brokers.map((b) => b.id)); // 否則全部選取
    }
  };

  const toggleBroker = (id: string) => {
    if (selectedBrokers.includes(id)) {
      if (selectedBrokers.length > 1) {
        onChange(selectedBrokers.filter((bId) => bId !== id));
      }
    } else {
      onChange([...selectedBrokers, id]);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        onClick={toggleAll}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          isAllSelected
            ? "bg-blue-900/30 text-blue-400 border border-blue-500/30"
            : "border border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        }`}
      >
        全部
      </button>
      {brokers.map((b) => {
        const isSelected = selectedBrokers.includes(b.id);
        return (
          <button
            key={b.id}
            onClick={() => toggleBroker(b.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? "bg-gray-800 text-gray-100 border border-gray-600 shadow-sm"
                : "border border-gray-800 bg-gray-950 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            }`}
          >
            {b.name}
          </button>
        );
      })}
    </div>
  );
}