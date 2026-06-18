export type Broker = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type BrokerSnapshot = {
  id: string;
  daily_snapshot_id: string;
  broker_id: string;
  amount: number;
  profit: number; // 新增：個別券商累積損益
};

export type SnapshotWithBrokers = {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_amount: number;
  total_profit: number; // 新增：總累積損益
  note: string | null;  // 新增：備註文字
  broker_snapshots?: BrokerSnapshot[];
};

export type DayData = {
  date: string;
  amount: number;
  changeAmount: number | null;
  changePercent: number | null;
};

export type ViewMode = "total" | string;