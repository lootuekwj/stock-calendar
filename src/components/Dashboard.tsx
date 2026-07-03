"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { computeDayChanges } from "@/lib/utils";
import type { Broker, DayData, SnapshotWithBrokers } from "@/types";
import Header from "./Header";
import ViewSelector from "./ViewSelector";
import Calendar from "./Calendar";
import TrendChart from "./TrendChart";
import EntryModal from "./EntryModal";
import BrokerManager from "./BrokerManager";

type Props = { user: User; };
// 新增 total 模式
type CalcMode = "asset" | "profit" | "total";

export default function Dashboard({ user }: Props) {
  const supabase = createClient();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotWithBrokers[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
  // 預設切換為 asset (證券資產)
  const [calcMode, setCalcMode] = useState<CalcMode>("asset"); 
  const [marketData, setMarketData] = useState<Map<string, number>>(new Map());
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [showEntry, setShowEntry] = useState(false);
  const [showBrokers, setShowBrokers] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [brokersRes, snapshotsRes, marketRes] = await Promise.all([
      supabase.from("brokers").select("*").order("sort_order", { ascending: true }),
      supabase.from("daily_snapshots").select("*, broker_snapshots(*)").order("snapshot_date", { ascending: true }),
      supabase.from("market_snapshots").select("snapshot_date, price").eq("symbol", "0050.TW").order("snapshot_date", { ascending: true }),
    ]);

    if (brokersRes.data) {
      setBrokers(brokersRes.data);
      setSelectedBrokers((prev) => prev.length === 0 ? brokersRes.data.map(b => b.id) : prev);
    }
    if (snapshotsRes.data) {
      setSnapshots(snapshotsRes.data as SnapshotWithBrokers[]);
    }
    if (marketRes.data) {
      const mData = new Map<string, number>();
      marketRes.data.forEach(item => {
        mData.set(item.snapshot_date, Number(item.price));
      });
      setMarketData(mData);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 根據不同模式，計算出當天要顯示的基準數值
  const dayDataMap = useMemo(() => {
    const entries = snapshots.map((s) => {
      let totalAmountForSelected = 0;
      let totalProfitForSelected = 0;
      let totalAssetsWithCash = 0; // 用於總資產模式
      
      s.broker_snapshots?.forEach((bs: any) => {
        if (selectedBrokers.includes(bs.broker_id)) {
          const stockAsset = Number(bs.amount || 0);
          const profit = Number(bs.profit || 0);
          const cash = Number(bs.cash_balance || 0);
          const settlement = Number(bs.settlement_amount || 0);

          totalAmountForSelected += stockAsset;
          totalProfitForSelected += profit;
          totalAssetsWithCash += (stockAsset + cash + settlement);
        }
      });
      
      let finalAmount = 0;
      if (calcMode === "asset") finalAmount = totalAmountForSelected;
      if (calcMode === "profit") finalAmount = totalProfitForSelected;
      if (calcMode === "total") finalAmount = totalAssetsWithCash;

      return { 
        date: s.snapshot_date, 
        amount: finalAmount 
      };
    });

    const changes = computeDayChanges(entries);
    return new Map(changes.map((d) => [d.date, d]));
  }, [snapshots, selectedBrokers, calcMode]);

  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100 selection:bg-blue-500/30">
      <div className="mx-auto max-w-2xl">
        <Header user={user} onAddClick={() => setShowEntry(true)} onBrokersClick={() => setShowBrokers(true)} onSignOut={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} />

        <main className="space-y-4 px-4 pb-8 pt-4">
          <ViewSelector brokers={brokers} selectedBrokers={selectedBrokers} onChange={setSelectedBrokers} />

          {/* 全新三大模式切換列：證券資產 -> 投資損益 -> 總資產 */}
          <div className="flex w-full rounded-xl border border-gray-800 bg-gray-900 p-1">
            <button onClick={() => setCalcMode("asset")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${calcMode === "asset" ? "bg-gray-800 text-blue-400 shadow-md border border-gray-700" : "text-gray-500 hover:text-gray-300"}`}>證券資產</button>
            <button onClick={() => setCalcMode("profit")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${calcMode === "profit" ? "bg-gray-800 text-blue-400 shadow-md border border-gray-700" : "text-gray-500 hover:text-gray-300"}`}>投資損益</button>
            <button onClick={() => setCalcMode("total")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${calcMode === "total" ? "bg-gray-800 text-blue-400 shadow-md border border-gray-700" : "text-gray-500 hover:text-gray-300"}`}>總資產</button>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">載入中...</div>
          ) : (
            <>
              <Calendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} dayDataMap={dayDataMap} snapshots={snapshots} brokers={brokers} selectedBrokers={selectedBrokers} calcMode={calcMode} />
              {/* 圖表元件，待下一步更新 */}
              <TrendChart snapshots={snapshots} selectedBrokers={selectedBrokers} currentMonth={currentMonth} calcMode={calcMode} marketData={marketData} />
            </>
          )}
        </main>

        {showEntry && <EntryModal brokers={brokers} onClose={() => setShowEntry(false)} onSaved={() => { setShowEntry(false); fetchData(); }} />}
        {showBrokers && <BrokerManager brokers={brokers} onClose={() => setShowBrokers(false)} onChanged={() => fetchData()} />}
      </div>
    </div>
  );
}