-- ============================================================
-- 股票資產損益行事曆 - Supabase 資料庫結構
-- 請在 Supabase Dashboard → SQL Editor 中執行此腳本
-- ============================================================

-- 1. 券商帳戶表
CREATE TABLE IF NOT EXISTS public.brokers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT brokers_user_name_unique UNIQUE (user_id, name)
);

-- 2. 每日資產快照（加總後的總資產）
CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  total_amount    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT daily_snapshots_user_date_unique UNIQUE (user_id, snapshot_date)
);

-- 3. 各券商每日資產明細
CREATE TABLE IF NOT EXISTS public.broker_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_snapshot_id   UUID NOT NULL REFERENCES public.daily_snapshots(id) ON DELETE CASCADE,
  broker_id           UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  amount              NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT broker_snapshots_unique UNIQUE (daily_snapshot_id, broker_id)
);

-- ============================================================
-- 索引（加速查詢）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_brokers_user_id ON public.brokers(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date ON public.daily_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_broker_snapshots_snapshot ON public.broker_snapshots(daily_snapshot_id);

-- ============================================================
-- 自動更新 updated_at 觸發器
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brokers_updated_at
  BEFORE UPDATE ON public.brokers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER daily_snapshots_updated_at
  BEFORE UPDATE ON public.daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Row Level Security (RLS) — 多使用者隱私隔離
-- ============================================================
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_snapshots ENABLE ROW LEVEL SECURITY;

-- brokers 政策
CREATE POLICY "Users can view own brokers"
  ON public.brokers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brokers"
  ON public.brokers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brokers"
  ON public.brokers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brokers"
  ON public.brokers FOR DELETE
  USING (auth.uid() = user_id);

-- daily_snapshots 政策
CREATE POLICY "Users can view own snapshots"
  ON public.daily_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.daily_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
  ON public.daily_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.daily_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- broker_snapshots 政策（透過 daily_snapshots 關聯驗證擁有權）
CREATE POLICY "Users can view own broker snapshots"
  ON public.broker_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_snapshots ds
      WHERE ds.id = daily_snapshot_id AND ds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own broker snapshots"
  ON public.broker_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_snapshots ds
      WHERE ds.id = daily_snapshot_id AND ds.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.brokers b
      WHERE b.id = broker_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own broker snapshots"
  ON public.broker_snapshots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_snapshots ds
      WHERE ds.id = daily_snapshot_id AND ds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own broker snapshots"
  ON public.broker_snapshots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_snapshots ds
      WHERE ds.id = daily_snapshot_id AND ds.user_id = auth.uid()
    )
  );

-- ============================================================
-- 便利視圖：含前一日比較的每日數據（可選）
-- ============================================================
CREATE OR REPLACE VIEW public.v_daily_with_change AS
SELECT
  ds.id,
  ds.user_id,
  ds.snapshot_date,
  ds.total_amount,
  LAG(ds.total_amount) OVER (
    PARTITION BY ds.user_id ORDER BY ds.snapshot_date
  ) AS prev_total_amount,
  ds.total_amount - LAG(ds.total_amount) OVER (
    PARTITION BY ds.user_id ORDER BY ds.snapshot_date
  ) AS change_amount,
  CASE
    WHEN LAG(ds.total_amount) OVER (
      PARTITION BY ds.user_id ORDER BY ds.snapshot_date
    ) IS NULL OR LAG(ds.total_amount) OVER (
      PARTITION BY ds.user_id ORDER BY ds.snapshot_date
    ) = 0 THEN NULL
    ELSE ROUND(
      ((ds.total_amount - LAG(ds.total_amount) OVER (
        PARTITION BY ds.user_id ORDER BY ds.snapshot_date
      )) / LAG(ds.total_amount) OVER (
        PARTITION BY ds.user_id ORDER BY ds.snapshot_date
      )) * 100,
      2
    )
  END AS change_percent
FROM public.daily_snapshots ds;
