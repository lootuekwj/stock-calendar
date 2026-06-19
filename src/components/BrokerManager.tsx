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

  // 新增：紀錄目前正在編輯哪個券商，以及編輯中的名稱
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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

  // 新增：處理修改儲存
  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null); // 如果清空代表不想改了，直接取消編輯狀態
      return;
    }
    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("brokers")
      .update({ name: editName.trim() })
      .eq("id", id);

    if (updateError) {
      setError("修改失敗");
      setSaving(false);
      return;
    }

    setEditingId(null);
    setEditName("");
    setSaving(false);
    onChanged();
  };

  // 新增：啟動編輯模式
  const startEditing = (broker: Broker) => {
    setEditingId(broker.id);
    setEditName(broker.name);
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
              <div key={b.id} className="flex min-h-[44px] items-center justify-between rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-2">
                {editingId === b.id ? (
                  // 編輯模式：顯示輸入框與儲存/取消按鈕
                  <div className="flex w-full items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(b.id)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-1"
                      autoFocus // 自動聚焦
                    />
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-200 disabled:opacity-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSaveEdit(b.id)}
                        disabled={saving || !editName.trim()}
                        className="rounded-lg bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-600/30 disabled:opacity-50"
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                ) : (
                  // 預設模式：顯示名稱與修改/刪除按鈕
                  <>
                    <span className="font-medium text-gray-200">{b.name}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEditing(b)}
                        disabled={saving}
                        className="text-xs font-medium text-gray-400 transition-colors hover:text-blue-400 disabled:opacity-50"
                      >
                        修改
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={saving}
                        className="text-xs font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    </div>
                  </>
                )}
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