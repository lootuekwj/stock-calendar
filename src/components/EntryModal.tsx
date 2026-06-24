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
  
  // UX 優化：控制備註欄位是否展開的狀態
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // 當日期改變時，自動去資料庫撈取當天是否已經有紀錄
  useEffect(() => {
    const fetchExisting = async () => {
      const { data, error } = await supabase
        .from("daily_snapshots")
        .select("*, broker_snapshots(*)")
        .eq("snapshot_date", date)
        .maybeSingle();

      if (data) {
        setNote(data.note || "");
        // 貼心設計：如果資料庫裡原本就有寫備註，就自動幫使用者展開
        if (data.note) {
          setShowNoteInput(true);
        } else {
          setShowNoteInput(false);
        }
        
        const newEntries: Record<string, { amount: string; profit: string }> = {};
        data.broker_snapshots?.forEach((bs: any) => {
          newEntries[bs.broker_id] = {
            amount: bs.amount?.toString() || "",
            profit: bs.profit?.toString() || "",
          };
        });
        setEntries(newEntries);
      } else {
        // 如果當天沒資料，清空欄位並收合備註
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
      
      // 1. 儲存每日總表與備註 (Upsert)
      const { data: snapshotData, error: snapError } = await supabase
        .from("daily_snapshots")
        .upsert({ snapshot_date: date, note: note || null }, { onConflict: "snapshot_date" })
        .select()
        .single();

      if (snapError) throw snapError;

      // 2. 儲存各券商明細 (Upsert)
      const upsertPromises = brokers.map((b) => {
        const entry = entries[b.id];
        // 確保空值時寫入 0
        const amount = entry?.amount ? Number(entry.amount) : 0;
        const profit = entry?.profit ? Number(entry.profit) : 0;
        
        // 如果連輸入都沒輸入，且金額都是 0，則跳過不存 (節省資料庫空間)
        if (!entry?.amount && !entry?.profit && amount === 0 && profit === 0) {
          return Promise.resolve();
        }

        return supabase.from("broker_snapshots").upsert({
          snapshot_id: snapshotData.id,
          broker_id: b.id,
          amount,
          profit,
        }, { onConflict: "snapshot_id,broker_id" });
      });

      await Promise.all(upsertPromises);
      onSaved();
    } catch (error) {
      console.error("儲存失敗:", error);
      alert("儲存失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  const handleEntryChange = (brokerId: string, field: "amount" | "profit", value: string) => {
    setEntries((prev) => ({
      ...prev,
      [brokerId]: {
        ...prev[brokerId],
        [field]: value,
      },
    }));
  };

  // 即時計算底部合計總額
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center">
      {/* Modal 容器：限制最大高度並設定可以滾動 */}
      <div className="flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl sm:max-w-md sm:rounded-2xl">
        
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between border-b border-gray-800/60 p-5">
          <h2 className="text-lg font-bold text-gray-100">記錄今日資料</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 內容滾動區塊 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 日期選擇器 */}
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 text-sm font-medium text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
          />

          {/* 券商輸入清單 */}
          <div className="space-y-3">
            {brokers.map((b) => (
              <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-200">{b.name}</div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-medium text-gray-500">總資產 (金額)</label>
                    <input 
                      type="number" 
                      placeholder="資產" 
                      value={entries[b.id]?.amount || ""} 
                      onChange={(e) => handleEntryChange(b.id, "amount", e.target.value)} 
                      className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-medium text-gray-500">累積損益 (選填)</label>
                    <input 
                      type="number" 
                      placeholder="損益" 
                      value={entries[b.id]?.profit || ""} 
                      onChange={(e) => handleEntryChange(b.id, "profit", e.target.value)} 
                      className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 交易筆記 / 備註 區塊 (收納展開設計) */}
          <div className="pt-2 pb-4">
            {!showNoteInput ? (
              <button
                type="button"
                onClick={() => setShowNoteInput(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 py-3.5 text-sm font-medium text-gray-400 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                新增交易筆記 / 備註
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-400">交易筆記 / 備註</label>
                  <button 
                    type="button"
                    onClick={() => { setShowNoteInput(false); setNote(""); }} 
                    className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
                  >
                    移除備註
                  </button>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="今天大盤大跌，加碼買進..."
                  className="h-24 w-full resize-none rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* 底部浮動合計與按鈕列 */}
        <div className="border-t border-gray-800/60 bg-gray-950 p-5">
          <div className="mb-4 flex justify-between rounded-xl border border-gray-800 bg-gray-900 p-3.5">
            <div>
              <div className="text-[11px] font-medium text-gray-500">合計總資產</div>
              <div className="mt-0.5 font-bold text-gray-100">{formatCurrency(totals.amount)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium text-gray-500">合計未實現損益</div>
              <div className="mt-0.5 font-bold text-gray-100">{formatCurrency(totals.profit)}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-800 bg-transparent py-3.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? "儲存中..." : "新增紀錄"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}