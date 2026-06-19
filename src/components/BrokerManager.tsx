"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/types";

type Props = {
  brokers: Broker[];
  onClose: () => void;
  onChanged: () => void;
};

export default function BrokerManager({ brokers, onClose, onChanged }: Props) {
  const supabase = createClient();
  const [brokerName, setBrokerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!brokerName.trim()) return;
    setSaving(true);
    setError("");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("請重新登入"); setSaving(false); return; }

    const { error: insertError } = await supabase.from("brokers").insert({
      user_id: user.id,
      name: brokerName.trim(),
      sort_order: brokers.length,
    });

    if (insertError) {
      setError("新增失敗");
      setSaving(false);
      return;
    }

    setBrokerName("");
    setSaving(false);
    onChanged();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("確定要刪除此券商嗎？這不會刪除歷史紀錄，但未來無法再選擇。")) return;
    setSaving(true);
    await supabase.from("brokers").delete().eq("id", id);
    setSaving(false);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-gray-800 bg-gray-900 p-5 shadow-2xl sm:mx-4 sm:rounded-2xl text-gray-100">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">管理券商帳戶</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">✕</button>
        </div>

        <div className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="輸入券商名稱..."
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !brokerName.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            新增
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {brokers.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">目前沒有任何券商，請在上方新增。</p>
          ) : (
            brokers.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3">
                <span className="font-medium text-gray-200">{b.name}</span>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={saving}
                  className="text-xs font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                >
                  刪除
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white sm:w-auto">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}