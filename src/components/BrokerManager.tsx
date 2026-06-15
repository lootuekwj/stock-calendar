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
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("未登入");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("brokers").insert({
      user_id: user.id,
      name,
      sort_order: brokers.length,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewName("");
      onChanged();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) return;

    setLoading(true);
    const { error: updateError } = await supabase
      .from("brokers")
      .update({ name })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditingId(null);
      onChanged();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此券商？相關歷史資料也會一併移除。")) return;

    setLoading(true);
    const { error: deleteError } = await supabase
      .from("brokers")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      onChanged();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:rounded-2xl sm:mx-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">券商帳戶管理</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="新增券商名稱（如：元大）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newName.trim()}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            新增
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {brokers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              尚無券商，請新增您的第一個帳戶
            </p>
          ) : (
            brokers.map((broker) => (
              <div
                key={broker.id}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"
              >
                {editingId === broker.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(broker.id)}
                      className="text-xs font-medium text-primary"
                    >
                      儲存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-muted"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {broker.name}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(broker.id);
                        setEditName(broker.name);
                      }}
                      className="rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-gray-100 hover:text-gray-900"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(broker.id)}
                      className="rounded-lg px-2 py-1 text-xs text-red-500 transition hover:bg-red-50"
                    >
                      刪除
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          完成
        </button>
      </div>
    </div>
  );
}
