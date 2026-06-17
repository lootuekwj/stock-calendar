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

type Props = {
  user: User;
};

export default function Dashboard({ user }: Props) {
  const supabase = createClient();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotWithBrokers[]>([]);
  
  // 升級：改成陣列，儲存多個券商 ID
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
  
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
      // 初次載入時，預設把所有券商都勾選起來
      setSelectedBrokers((prev) => prev.length === 0 ? brokersRes.data.map(b => b.id) : prev);
    }
    if (snapshotsRes.data) setSnapshots(snapshotsRes.data as SnapshotWithBrokers[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 核心計算大腦：根據勾選的券商重新加總每一天的金額
  const dayDataMap = useMemo(() => {
    const entries = snapshots.map((s) => {
      let totalAmountForSelected = 0;
      s.broker_snapshots?.forEach((bs) => {
        if (selectedBrokers.includes(bs.broker_id)) {
          totalAmountForSelected += Number(bs.amount);
        }
      });
      return { date: s.snapshot_date, amount: totalAmountForSelected };
    });

    const changes = computeDayChanges(entries);
    return new Map(changes.map((d) => [d.date, d]));
  }, [snapshots, selectedBrokers]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <Header
        user={user}
        onAddClick={() => setShowEntry(true)}
        onBrokersClick={() => setShowBrokers(true)}
        onSignOut={handleSignOut}
      />

      <main className="space-y-4 px-4 pb-8 pt-4">
        {/* 新版的多選選單 */}
        <ViewSelector
          brokers={brokers}
          selectedBrokers={selectedBrokers}
          onChange={setSelectedBrokers}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">載入中...</div>
        ) : (
          <>
            <Calendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              dayDataMap={dayDataMap}
              snapshots={snapshots}
              brokers={brokers}
              selectedBrokers={selectedBrokers}
            />
            {/* 圖表現在自己處理時間區間，我們把資料池和當前行事曆月份傳給它 */}
            <TrendChart 
              dayDataMap={dayDataMap} 
              currentMonth={currentMonth} 
            />
          </>
        )}
      </main>

      {showEntry && (
        <EntryModal brokers={brokers} onClose={() => setShowEntry(false)} onSaved={() => { setShowEntry(false); fetchData(); }} />
      )}
      {showBrokers && (
        <BrokerManager brokers={brokers} onClose={() => setShowBrokers(false)} onChanged={() => { fetchData(); }} />
      )}
    </div>
  );
}