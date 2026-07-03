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

type EntryFields = {
  amount: string;          // 股票資產
  profit: string;          // 累積損益
  cash_balance: string;    // 現金餘額
  settlement_amount: string; // 交割款
};

export default function EntryModal({ brokers, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<Record<string, EntryFields>>({});
  const [note, setNote] = useState("");
  
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    const fetchExistingOrDefaults = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. 先查當天是否已有紀錄
      const { data } = await supabase
        .from("daily_snapshots")
        .select("*, broker_snapshots(*)")
        .eq("snapshot_date", date)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setHasExisting(true);
        setNote(data.note || "");
        setShowNoteInput(!!data.note);
        const newEntries: Record<string, EntryFields> = {};
        data.broker_snapshots?.forEach((bs: any) => {
          newEntries[bs.broker_id] = {
            amount: bs.amount?.toString() || "",
            profit: bs.profit?.toString() || "",
            cash_balance: bs.cash_balance?.toString() || "",
            settlement_amount: bs.settlement_amount?.toString() || "0",
          };
        });
        setEntries(newEntries);
      } else {
        // 2. 當天沒紀錄！智慧防呆：自動撈取該日期之前的「最新一筆歷史紀錄」作為預填預設值
        setHasExisting(false);
        setNote("");
        setShowNoteInput(false);

        const { data: prevSnapshot } = await supabase
          .from("daily_snapshots")
          .select("*, broker_snapshots(*)")
          .lt("snapshot_date", date)
          .eq("user_id", user.id)
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const defaultEntries: Record<string, EntryFields> = {};
        
        brokers.forEach((b) => {
          // 如果有找到前一次紀錄，則預填 股票、損益、現金；交割款固定歸 0
          const prevBrokerData = prevSnapshot?.broker_snapshots?.find((bs: any) => bs.broker_id === b.id);
          
          defaultEntries[b.id] = {
            amount: prevBrokerData?.amount?.toString() || "",
            profit: prevBrokerData?.profit?.toString() || "",
            cash_balance: prevBrokerData?.cash_balance?.toString() || "",
            settlement_amount: "0", // 交割款預設必為 0
          };
        });
        setEntries(defaultEntries);
      }
    };
    fetchExistingOrDefaults();
  }, [date, brokers, supabase]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("使用者身分驗證失敗，請重新登入");
      
      let snapshotId;
      const { data: existing } = await supabase
        .from("daily_snapshots")
        .select("id")
        .eq("snapshot_date", date)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        snapshotId = existing.id;
        const { error: updateError } = await supabase
          .from("daily_snapshots")
          .update({ note: note || null })
          .eq("id", snapshotId)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("daily_snapshots")
          .insert({ snapshot_date: date, note: note || null, user_id: user.id })
          .select().single();
        if (insertError) throw insertError;
        snapshotId = inserted.id;
      }

      await Promise.all(brokers.map((b) => {
        const entry = entries[b.id];
        const amount = entry?.amount ? Number(entry.amount) : 0;
        const profit = entry?.profit ? Number(entry.profit) : 0;
        const cash = entry?.cash_balance ? Number(entry.cash_balance) : 0;
        const settlement = entry?.settlement_amount ? Number(entry.settlement_amount) : 0;

        // 如果全新資料全為 0 且未填，跳過不存以維護容量
        if (!entry?.amount && !entry?.profit && !entry?.cash_balance && settlement === 0 && amount === 0 && profit === 0 && cash === 0) {
          return Promise.resolve();
        }

        return supabase.from("broker_snapshots").upsert({
          daily_snapshot_id: snapshotId,
          broker_id: b.id,
          amount,
          profit,
          cash_balance: cash,
          settlement_amount: settlement,
        }, { onConflict: "daily_snapshot_id,broker_id" });
      }));

      onSaved();
    } catch (e: any) {
      alert(`儲存失敗: ${e.message || "資料庫錯誤"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定刪除此筆資料？")) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("身分驗證失敗");

      const { error } = await supabase
        .from("daily_snapshots")
        .delete()
        .eq("snapshot_date", date)
        .eq("user_id", user.id);
      if (error) throw error;
      onSaved();
    } catch (e: any) {
      alert(`刪除失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryChange = (brokerId: string, field: keyof EntryFields, value: string) => {
    if (value !== "" && !/^-?[0-9]*\.?[0-9]*$/.test(value)) return;
    setEntries((prev) => ({
      ...prev,
      [brokerId]: { ...prev[brokerId], [field]: value },
    }));
  };

  // 正負號切換通用函式
  const toggleSign = (brokerId: string, field: "profit" | "settlement_amount") => {
    setEntries((prev) => {
      const currentVal = prev[brokerId]?.[field] || "";
      let newVal = currentVal;
      if (currentVal.startsWith("-")) {
        newVal = currentVal.slice(1);
      } else if (currentVal !== "" && currentVal !== "0") {
        newVal = "-" + currentVal;
      } else {
        newVal = "-";
      }
      return {
        ...prev,
        [brokerId]: { ...prev[brokerId], [field]: newVal }
      };
    });
  };

  // 底部即時加總面板數據 (此處加總包含股票+現金+交割款)
  const totals = useMemo(() => {
    let totalStock = 0;
    let totalProfit = 0;
    let totalCashAndSettlement = 0;
    Object.values(entries).forEach((e) => {
      totalStock += Number(e.amount || 0);
      totalProfit += Number(e.profit || 0);
      totalCashAndSettlement += Number(e.cash_balance || 0) + Number(e.settlement_amount || 0);
    });
    return { 
      assets: totalStock, 
      profit: totalProfit, 
      overall: totalStock + totalCashAndSettlement 
    };
  }, [entries]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="flex max-h-[95vh] w-full flex-col rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl sm:max-w-md sm:rounded-2xl">
        
        <div className="flex items-center justify-between border-b border-gray-800/60 p-5">
          <h2 className="text-lg font-bold text-gray-100">記錄今日資料</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 text-sm font-medium text-gray-100 focus:border-blue-500 focus:outline-none" />

          <div className="space-y-4">
            {brokers.map((b) => (
              <div key={b.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-sm flex flex-col gap-3">
                <div className="text-sm font-bold text-blue-400 border-b border-gray-800 pb-1.5">{b.name}</div>
                
                {/* 第一排：股票資產 & 累積損益 */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-gray-500">1. 股票資產</label>
                    <input 
                      type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="未填使用上次值"
                      value={entries[b.id]?.amount || ""} 
                      onChange={(e) => handleEntryChange(b.id, "amount", e.target.value)} 
                      className="w-full bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-sm text-white focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-gray-500">2. 累積損益</label>
                    <div className="relative flex items-center">
                      <input 
                        type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="選填"
                        value={entries[b.id]?.profit || ""} 
                        onChange={(e) => handleEntryChange(b.id, "profit", e.target.value)} 
                        className="w-full bg-gray-950 pl-2.5 pr-10 py-2.5 rounded-lg border border-gray-800 text-sm text-white focus:border-blue-500 focus:outline-none" 
                      />
                      <button type="button" onClick={() => toggleSign(b.id, "profit")} className="absolute right-1.5 px-1.5 py-1 rounded bg-gray-800 text-[10px] font-bold text-gray-400 active:bg-gray-700 active:text-white">+/-</button>
                    </div>
                  </div>
                </div>

                {/* 第二排：現金餘額 & 交割款 */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-gray-500">3. 現金餘額</label>
                    <input 
                      type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="帳戶內現金"
                      value={entries[b.id]?.cash_balance || ""} 
                      onChange={(e) => handleEntryChange(b.id, "cash_balance", e.target.value)} 
                      className="w-full bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-sm text-white focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-gray-500">4. 交割款</label>
                    <div className="relative flex items-center">
                      <input 
                        type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="預設 0"
                        value={entries[b.id]?.settlement_amount || ""} 
                        onChange={(e) => handleEntryChange(b.id, "settlement_amount", e.target.value)} 
                        className="w-full bg-gray-950 pl-2.5 pr-10 py-2.5 rounded-lg border border-gray-800 text-sm text-white focus:border-blue-500 focus:outline-none" 
                      />
                      <button type="button" onClick={() => toggleSign(b.id, "settlement_amount")} className="absolute right-1.5 px-1.5 py-1 rounded bg-gray-800 text-[10px] font-bold text-gray-400 active:bg-gray-700 active:text-white">+/-</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1">
            {!showNoteInput ? (
              <button type="button" onClick={() => setShowNoteInput(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 py-2.5 text-xs text-gray-400 hover:text-gray-200">
                + 新增交易筆記 / 備註
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">交易筆記 / 備註</label>
                  <button type="button" onClick={() => { setShowNoteInput(false); setNote(""); }} className="text-[11px] text-gray-500 hover:text-red-400">移除</button>
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註內容..." className="h-16 w-full resize-none rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800/60 bg-gray-950 p-5">
          <div className="mb-4 flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs text-gray-400">
            <div className="flex justify-between"><span>合計股票資產:</span><span className="font-bold text-gray-200">{formatCurrency(totals.assets)}</span></div>
            <div className="flex justify-between border-t border-gray-800/60 pt-1 mt-1 font-bold text-blue-400"><span>智慧加總預估總資產:</span><span>{formatCurrency(totals.overall)}</span></div>
          </div>
          <div className="flex gap-3">
            {hasExisting && (
              <button onClick={handleDelete} disabled={loading} className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 hover:bg-red-900/50">
                刪除
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-800 py-3 text-sm text-gray-300">
              取消
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700">
              {loading ? "處理中..." : hasExisting ? "儲存更新" : "新增紀錄"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}