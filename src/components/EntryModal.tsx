"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, toDateString } from "@/lib/utils";
import type { Broker } from "@/types";

type Props = {
  brokers: Broker[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EntryModal({ brokers, onClose, onSaved }: Props) {
  const supabase = createClient();
  const today = toDateString(new Date());
  const [date, setDate] = useState(today);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initial: Record<string, string> = {};
    brokers.forEach((b) => {
      initial[b.id] = "";
    });
    setAmounts(initial);
  }, [brokers]);

  const total = Object.values(amounts).reduce((sum, v) => {
    const n = parseFloat(v);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const handleSave = async () => {
    if (brokers.length === 0) {
      setError("請先新增至少一個券商帳戶");
      return;
    }

    const hasValue = Object.values(amounts).some(
      (v) => v.trim() !== "" && !isNaN(parseFloat(v))
    );
    if (!hasValue) {
      setError("請至少輸入一個券商的資產金額");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("未登入，請重新登入");
      setSaving(false);
      return;
    }

    const { data: snapshot, error: snapError } = await supabase
      .from("daily_snapshots")
      .upsert(
        {
          user_id: user.id,
          snapshot_date: date,
          total_amount: total,
        },
        { onConflict: "user_id,snapshot_date" }
      )
      .select("id")
      .single();

    if (snapError || !snapshot) {
      setError(snapError?.message ?? "儲存失敗");
      setSaving(false);
      return;
    }

    const brokerRows = brokers
      .filter((b) => amounts[b.id]?.trim() !== "")
      .map((b) => ({
        daily_snapshot_id: snapshot.id,
        broker_id: b.id,
        amount: parseFloat(amounts[b.id]) || 0,
      }));

    if (brokerRows.length > 0) {
      await supabase
        .from("broker_snapshots")
        .delete()
        .eq("daily_snapshot_id", snapshot.id);

      const { error: brokerError } = await supabase
        .from("broker_snapshots")
        .insert(brokerRows);

      if (brokerError) {
        setError(brokerError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:rounded-2xl sm:mx-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">記錄今日資產</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {brokers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            尚未設定券商，請先點擊「券商」新增帳戶
          </p>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                日期
              </label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
              {brokers.map((broker) => (
                <div key={broker.id}>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {broker.name}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="輸入總資產"
                    value={amounts[broker.id] ?? ""}
                    onChange={(e) =>
                      setAmounts((prev) => ({
                        ...prev,
                        [broker.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>

            <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">每日總資產</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="mb-3 text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || brokers.length === 0}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
