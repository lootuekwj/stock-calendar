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

// 新增模式：asset (資產總額) | profit (投資損益)
type CalcMode = "asset" | "profit";

export default function Dashboard({ user }: Props) {
  const supabase = createClient();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotWithBrokers[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
  const [calcMode, setCalcMode] = useState<CalcMode>("asset"); 
  
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [showEntry, setShowEntry] = useState(false);
  const [showBrokers, setShowBrokers] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [brokersRes, snapshotsRes] = await Promise.all([
      supabase.from("brokers").select("*").order("sort_order", { ascending: true }),
      supabase.from("daily_snapshots").select("*, broker_snapshots(*)").order("snapshot_date", { ascending: true }),
    ]);

    if (brokersRes.data) {
      setBrokers(brokersRes.data);
      setSelectedBrokers((prev) => prev.length === 0 ? brokersRes.data.map(b => b.id) : prev);
    }
    if (snapshotsRes.data) setSnapshots(snapshotsRes.data as SnapshotWithBrokers[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 根據目前模式 (資產 或 損益) 重新計算
  const dayDataMap = useMemo(() => {
    const entries = snapshots.map((s) => {
      let totalAmountForSelected = 0;
      let totalProfitForSelected = 0;
      
      s.broker_snapshots?.forEach((bs) => {
        if (selectedBrokers.includes(bs.broker_id)) {
          totalAmountForSelected += Number(bs.amount || 0);
          totalProfitForSelected += Number(bs.profit || 0);
        }
      });
      
      return { 
        date: s.snapshot_date, 
        amount: calcMode === "asset" ? totalAmountForSelected : totalProfitForSelected 
      };
    });

    const changes = computeDayChanges(entries);
    return new Map(changes.map((d) => [d.date, d]));
  }, [snapshots, selectedBrokers, calcMode]);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <Header user={user} onAddClick={() => setShowEntry(true)} onBrokersClick={() => setShowBrokers(true)} onSignOut={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} />

      <main className="space-y-4 px-4 pb-8 pt-4">
        <ViewSelector brokers={brokers} selectedBrokers={selectedBrokers} onChange={setSelectedBrokers} />

        {/* 雙軌切換開關 */}
        <div className="flex w-full rounded-xl border border-border bg-gray-50 p-1">
          <button onClick={() => setCalcMode("asset")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${calcMode === "asset" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
            💰 總資產模式
          </button>
          <button onClick={() => setCalcMode("profit")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${calcMode === "profit" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
            📈 投資損益模式
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">載入中...</div>
        ) : (
          <>
            <Calendar 
              currentMonth={currentMonth} onMonthChange={setCurrentMonth} dayDataMap={dayDataMap} 
              snapshots={snapshots} brokers={brokers} selectedBrokers={selectedBrokers} calcMode={calcMode}
            />
            <TrendChart dayDataMap={dayDataMap} currentMonth={currentMonth} />
          </>
        )}
      </main>

      {showEntry && <EntryModal brokers={brokers} onClose={() => setShowEntry(false)} onSaved={() => { setShowEntry(false); fetchData(); }} />}
      {showBrokers && <BrokerManager brokers={brokers} onClose={() => setShowBrokers(false)} onChanged={() => fetchData()} />}
    </div>
  );
}