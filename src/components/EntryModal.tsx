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
  const [profits, setProfits] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const fetchExistingData = async () => {
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: snapshot } = await supabase
        .from("daily_snapshots")
        .select("id, note")
        .eq("user_id", user.id)
        .eq("snapshot_date", date)
        .single();

      if (snapshot) {
        setExistingId(snapshot.id);
        setNote(snapshot.note || "");
        const { data: brokerRows } = await supabase
          .from("broker_snapshots")
          .select("broker_id, amount, profit")
          .eq("daily_snapshot_id", snapshot.id);

        const fetchedAmounts: Record<string, string> = {};
        const fetchedProfits: Record<string, string> = {};
        brokers.forEach((b) => {
          fetchedAmounts[b.id] = "";
          fetchedProfits[b.id] = "";
        });

        if (brokerRows) {
          brokerRows.forEach((row) => {
            fetchedAmounts[row.broker_id] = row.amount.toString();
            fetchedProfits[row.broker_id] = row.profit ? row.profit.toString() : "0";
          });
        }
        setAmounts(fetchedAmounts);
        setProfits(fetchedProfits);
      } else {
        setExistingId(null);
        setNote("");
        const initAmounts: Record<string, string> = {};
        const initProfits: Record<string, string> = {};
        brokers.forEach((b) => {
          initAmounts[b.id] = "";
          initProfits[b.id] = "";
        });
        setAmounts(initAmounts);
        setProfits(initProfits);
      }
      setLoadingData(false);
    };

    fetchExistingData();
  }, [date, brokers, supabase]);

  const totalAmount = Object.values(amounts).reduce((sum, v) => sum + (isNaN(parseFloat(v)) ? 0 : parseFloat(v)), 0);
  const totalProfit = Object.values(profits).reduce((sum, v) => sum + (isNaN(parseFloat(v)) ? 0 : parseFloat(v)), 0);

  const handleDelete = async () => {
    if (!existingId) return;
    if (!window.confirm("確定要刪除這天的紀錄嗎？")) return;
    setSaving(true);
    await supabase.from("daily_snapshots").delete().eq("id", existingId);
    setSaving(false);
    onSaved();
  };

  const handleSave = async () => {
    if (brokers.length === 0) return setError("請先新增券商帳戶");
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("請重新登入"); setSaving(false); return; }

    const { data: snapshot, error: snapError } = await supabase
      .from("daily_snapshots")
      .upsert(
        { user_id: user.id, snapshot_date: date, total_amount: totalAmount, total_profit: totalProfit, note: note },
        { onConflict: "user_id,snapshot_date" }
      )
      .select("id").single();

    if (snapError || !snapshot) { setError("儲存失敗"); setSaving(false); return; }

    const brokerRows = brokers
      .filter((b) => amounts[b.id]?.trim() !== "" || profits[b.id]?.trim() !== "")
      .map((b) => ({
        daily_snapshot_id: snapshot.id,
        broker_id: b.id,
        amount: parseFloat(amounts[b.id]) || 0,
        profit: parseFloat(profits[b.id]) || 0,
      }));

    await supabase.from("broker_snapshots").delete().eq("daily_snapshot_id", snapshot.id);
    if (brokerRows.length > 0) {
      await supabase.from("broker_snapshots").insert(brokerRows);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:mx-4 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{existingId ? "修改今日資料" : "記錄今日資料"}</h2>
          <button onClick={onClose} className="text-muted hover:bg-gray-100 h-8 w-8 rounded-lg">✕</button>
        </div>

        {brokers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">尚未設定券商</p>
        ) : (
          <>
            <div className="mb-4">
              <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            {loadingData ? <p className="py-4 text-center text-sm text-muted">讀取中...</p> : (
              <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
                {brokers.map((broker) => (
                  <div key={broker.id} className="rounded-xl border border-border bg-gray-50/50 p-3">
                    <label className="mb-2 block text-sm font-semibold text-gray-900">{broker.name}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="mb-1 block text-xs text-muted">總資產 (金額)</span>
                        <input type="number" inputMode="decimal" placeholder="資產" value={amounts[broker.id] ?? ""} onChange={(e) => setAmounts((p) => ({ ...p, [broker.id]: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1" />
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-muted">累積損益 (選填)</span>
                        <input type="number" inputMode="decimal" placeholder="損益" value={profits[broker.id] ?? ""} onChange={(e) => setProfits((p) => ({ ...p, [broker.id]: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">交易筆記 / 備註</label>
              <textarea placeholder="今天大盤大跌，加碼買進..." value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="mb-4 flex gap-2 rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex-1">
                <span className="block text-xs text-muted">合計總資產</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex-1 border-l border-border pl-4">
                <span className="block text-xs text-muted">合計未實現損益</span>
                <span className={`text-sm font-bold ${totalProfit > 0 ? "text-red-500" : totalProfit < 0 ? "text-green-500" : "text-gray-900"}`}>{totalProfit > 0 ? "+" : ""}{formatCurrency(totalProfit)}</span>
              </div>
            </div>
          </>
        )}

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          {existingId && <button onClick={handleDelete} disabled={saving} className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100">刪除</button>}
          {!existingId && <button onClick={onClose} className="flex-1 rounded-xl border px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>}
          <button onClick={handleSave} disabled={saving || brokers.length === 0 || loadingData} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">
            {saving ? "處理中..." : (existingId ? "儲存修改" : "新增紀錄")}
          </button>
        </div>
      </div>
    </div>
  );
}