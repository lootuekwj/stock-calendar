export type Broker = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DailySnapshot = {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type BrokerSnapshot = {
  id: string;
  daily_snapshot_id: string;
  broker_id: string;
  amount: number;
  created_at: string;
};

export type DayData = {
  date: string;
  amount: number;
  changeAmount: number | null;
  changePercent: number | null;
};

export type ViewMode = "total" | string;

export type SnapshotWithBrokers = DailySnapshot & {
  broker_snapshots: (BrokerSnapshot & { broker?: Broker })[];
};
