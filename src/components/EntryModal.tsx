"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { Broker } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  brokers: Broker[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EntryModal({ brokers, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<Record<string, { amount: string; profit: string }>>({});
  const [note, setNote] = useState("");
  
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("daily_snapshots")
        .select("*, broker_snapshots(*)")
        .eq("snapshot_date", date)
        .maybeSingle();

      if (data) {
        setHasExisting(true);
        setNote(data.note || "");
        setShowNoteInput(!!data.note);
        const newEntries: Record<string, { amount: string; profit: string }> = {};
        data.broker_snapshots?.forEach((bs: any) => {
          newEntries[bs.broker_id] = {
            amount: bs.amount?.toString() || "",
            profit: bs.profit?.toString() || "",
          };
        });
        setEntries(newEntries);
      } else {
        setHasExisting(false);
        setNote("");
        setShowNoteInput(false);
        setEntries({});
      }
    };
    fetchExisting();
  }, [date, supabase]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      let snapshotId;
      const { data: existing } = await supabase
        .from("daily_snapshots")
        .select("id")
        .eq("snapshot_date", date)
        .maybeSingle();

      // 總表儲存邏輯
      if (existing) {
        snapshotId = existing.id;
        const { error: updateError } = await supabase
          .from("daily_snapshots")
          .update({ note: note || null })
          .eq("id", snapshotId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("daily_snapshots")
          .insert({ snapshot_date: date, note: note || null, user_id: user?.id })
          .select().single();
        if (insertError) throw insertError;
        snapshotId = inserted.id;
      }

      // 明細表儲存邏輯 (已修正為正確的 daily_snapshot_id)
      await Promise.all(brokers.map((b) => {
        const entry = entries[b.id];
        const amount = entry?.amount ? Number(entry.amount) : 0;
        const profit = entry?.profit ? Number(entry.profit) : 0;

        if (!entry?.amount && !entry?.profit && amount === 0 && profit === 0) {
          return Promise.resolve();
        }

        return supabase.from("broker_snapshots").upsert({
          daily_snapshot_id: snapshotId, // 修正這裡！
          broker_id: b.id,
          amount,
          profit,
        }, { onConflict: "daily_snapshot_id,broker_id" }); // 修正這裡！
      }));

      onSaved();
    } catch (e: any) {
      console.error("儲存失敗詳細原因:", e);
      alert(`儲存失敗: ${e.message || "未知資料庫錯誤"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定刪除此筆資料？")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("daily_snapshots").delete().eq("snapshot_date", date);
      if (error) throw error;
      onSaved();
    } catch (e: any) {
      alert(`刪除失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryChange = (brokerId: string, field: "amount" | "profit", value: string) => {
    if (value !== "" && !/^-?[0-9]*\.?[0-9]*$/.test(value)) return;
    setEntries((prev) => ({
      ...prev,
      [brokerId]: { ...prev[brokerId], [field]: value },
    }));
  };

  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalProfit = 0;
    Object.values(entries).forEach((e) => {
      totalAmount += Number(e.amount || 0);
      totalProfit += Number(e.profit || 0);
    });
    return { amount: totalAmount, profit: totalProfit };
  }, [entries]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl sm:max-w-md sm:rounded-2xl">
        
        <div className="flex items-center justify-between border-b border-gray-800/60 p-5">
          <h2 className="text-lg font-bold text-gray-100">記錄今日資料</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 text-sm font-medium text-gray-100 focus:border-blue-500 focus:outline-none" />

          <div className="space-y-3">
            {brokers.map((b) => (
              <div key={b.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-sm flex flex-col gap-2">
                <div className="text-sm font-medium text-gray-200">{b.name}</div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-gray-500">總資產 (金額)</label>
                    <input 
                      type="text" 
                      inputMode="decimal" 
                      pattern="[0-9.]*"
                      placeholder="資產" 
                      value={entries[b.id]?.amount || ""} 
                      onChange={(e) => handleEntryChange(b.id, "amount", e.target.value)} 
                      className="w-full bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-sm text-white focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-gray-500">累積損益 (選填)</label>
                    <input 
                      type="text" 
                      inputMode="decimal" 
                      pattern="[0-9.]*"
                      placeholder="損益" 
                      value={entries[b.id]?.profit || ""} 
                      onChange={(e) => handleEntryChange(b.id, "profit", e.target.value)} 
                      className="w-full bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-sm text-white focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 pb-2">
            {!showNoteInput ? (
              <button type="button" onClick={() => setShowNoteInput(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 py-3 text-sm text-gray-400 hover:text-gray-200 transition-all">
                + 新增交易筆記 / 備註
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">交易筆記 / 備註</label>
                  <button type="button" onClick={() => { setShowNoteInput(false); setNote(""); }} className="text-[11px] text-gray-500 hover:text-red-400">移除</button>
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註內容..." className="h-20 w-full resize-none rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800/60 bg-gray-950 p-5">
          <div className="mb-4 flex justify-between rounded-xl border border-gray-800 bg-gray-900 p-3">
            <div>
              <div className="text-[11px] text-gray-500">合計總資產</div>
              <div className="font-bold text-gray-100">{formatCurrency(totals.amount)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-500">合計未實現損益</div>
              <div className="font-bold text-gray-100">{formatCurrency(totals.profit)}</div>
            </div>
          </div>
          <div className="flex gap-3">
            {hasExisting && (
              <button onClick={handleDelete} disabled={loading} className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 hover:bg-red-900/50 transition-colors">
                刪除
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-800 py-3 text-sm text-gray-300">
              取消
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              {loading ? "處理中..." : hasExisting ? "儲存更新" : "新增紀錄"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}