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
  // 新增：用來記錄這天是不是已經有存過資料了
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // 升級版：當「日期」改變時，自動去資料庫檢查那天有沒有舊資料
  useEffect(() => {
    const fetchExistingData = async () => {
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 尋找這天的總紀錄
      const { data: snapshot } = await supabase
        .from("daily_snapshots")
        .select("id")
        .eq("user_id", user.id)
        .eq("snapshot_date", date)
        .single();

      if (snapshot) {
        setExistingId(snapshot.id);
        // 如果有總紀錄，把各券商的金額抓出來
        const { data: brokerRows } = await supabase
          .from("broker_snapshots")
          .select("broker_id, amount")
          .eq("daily_snapshot_id", snapshot.id);

        const fetchedAmounts: Record<string, string> = {};
        brokers.forEach((b) => {
          fetchedAmounts[b.id] = ""; // 先預設為空
        });

        if (brokerRows) {
          brokerRows.forEach((row) => {
            fetchedAmounts[row.broker_id] = row.amount.toString();
          });
        }
        setAmounts(fetchedAmounts);
      } else {
        // 如果這天沒資料，清空所有格子
        setExistingId(null);
        const initial: Record<string, string> = {};
        brokers.forEach((b) => {
          initial[b.id] = "";
        });
        setAmounts(initial);
      }
      setLoadingData(false);
    };

    fetchExistingData();
  }, [date, brokers, supabase]);

  const total = Object.values(amounts).reduce((sum, v) => {
    const n = parseFloat(v);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  // 新增：刪除功能
  const handleDelete = async () => {
    if (!existingId) return;
    if (!window.confirm("確定要刪除這天的紀錄嗎？刪除後無法復原喔！")) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("daily_snapshots")
      .delete()
      .eq("id", existingId);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved(); // 重新整理畫面並關閉視窗
  };

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

    const { data: { user } } = await supabase.auth.getUser();
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
    } else {
      // 如果使用者清空了所有券商金額但按儲存，就把原本的明細刪掉
      await supabase
        .from("broker_snapshots")
        .delete()
        .eq("daily_snapshot_id", snapshot.id);
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
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:mx-4 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingId ? "修改今日資產" : "記錄今日資產"}
          </h2>
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

            {loadingData ? (
              <p className="py-4 text-center text-sm text-muted">讀取資料中...</p>
            ) : (
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
            )}

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

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        {/* 下方的按鈕區塊大升級 */}
        <div className="flex gap-2">
          {existingId && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              刪除紀錄
            </button>
          )}
          
          {/* 如果沒有舊資料，取消按鈕就會顯示；有舊資料的話空間給刪除按鈕 */}
          {!existingId && (
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              取消
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || brokers.length === 0 || loadingData}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "處理中..." : (existingId ? "儲存修改" : "新增紀錄")}
          </button>
        </div>
      </div>
    </div>
  );
}