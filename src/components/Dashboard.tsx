"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { computeDayChanges } from "@/lib/utils";
import type { Broker, DayData, SnapshotWithBrokers, ViewMode } from "@/types";
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
  const [viewMode, setViewMode] = useState<ViewMode>("total");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [showEntry, setShowEntry] = useState(false);
  const [showBrokers, setShowBrokers] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [brokersRes, snapshotsRes] = await Promise.all([
      supabase
        .from("brokers")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("daily_snapshots")
        .select("*, broker_snapshots(*)")
        .order("snapshot_date", { ascending: true }),
    ]);

    if (brokersRes.data) setBrokers(brokersRes.data);
    if (snapshotsRes.data) setSnapshots(snapshotsRes.data as SnapshotWithBrokers[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dayDataMap = useMemo(() => {
    const entries = snapshots.map((s) => {
      if (viewMode === "total") {
        return { date: s.snapshot_date, amount: Number(s.total_amount) };
      }
      const brokerSnap = s.broker_snapshots?.find(
        (bs) => bs.broker_id === viewMode
      );
      return {
        date: s.snapshot_date,
        amount: brokerSnap ? Number(brokerSnap.amount) : 0,
      };
    });

    const changes = computeDayChanges(
      entries.filter((e) => e.amount > 0 || viewMode === "total")
    );

    return new Map(changes.map((d) => [d.date, d]));
  }, [snapshots, viewMode]);

  const chartData: DayData[] = useMemo(() => {
    return Array.from(dayDataMap.values());
  }, [dayDataMap]);

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
        <ViewSelector
          viewMode={viewMode}
          brokers={brokers}
          onChange={setViewMode}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">
            載入中...
          </div>
        ) : (
          <>
            <Calendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              dayDataMap={dayDataMap}
            />
            <TrendChart data={chartData} />
          </>
        )}
      </main>

      {showEntry && (
        <EntryModal
          brokers={brokers}
          onClose={() => setShowEntry(false)}
          onSaved={() => {
            setShowEntry(false);
            fetchData();
          }}
        />
      )}

      {showBrokers && (
        <BrokerManager
          brokers={brokers}
          onClose={() => setShowBrokers(false)}
          onChanged={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
