# 股票資產損益行事曆

多使用者隱私保護的股票資產追蹤 Web App。透過 GitHub 登入，以月曆與折線圖視覺化每日資產漲跌。

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| 後端 / 資料庫 | Supabase (Auth + PostgreSQL + RLS) |
| 圖表 | Recharts |
| 部署 | Vercel（推薦）或 GitHub Pages |

---

## 第一步：建立 Supabase 專案

### 1.1 註冊並建立專案

1. 前往 [https://supabase.com](https://supabase.com) 註冊帳號
2. 點擊 **New Project**，選擇組織、輸入專案名稱（如 `stock-calendar`）
3. 設定資料庫密碼與區域（建議選 Tokyo 或 Singapore）
4. 等待專案建立完成（約 1–2 分鐘）

### 1.2 執行資料庫 Schema

1. 進入 Supabase Dashboard → **SQL Editor**
2. 點擊 **New query**
3. 複製 [`supabase/schema.sql`](./supabase/schema.sql) 的全部內容並貼上
4. 點擊 **Run** 執行

#### 資料表結構說明

```
auth.users (Supabase 內建)
    │
    ├── brokers              券商帳戶（每人可有多個）
    │     id, user_id, name, sort_order
    │
    ├── daily_snapshots      每日資產快照（加總）
    │     id, user_id, snapshot_date, total_amount
    │
    └── broker_snapshots     各券商每日明細
          id, daily_snapshot_id, broker_id, amount
```

所有資料表皆啟用 **RLS (Row Level Security)**，確保 `auth.uid() = user_id`，使用者之間資料完全隔離。

### 1.3 設定 GitHub OAuth 登入

#### A. 建立 GitHub OAuth App

1. 前往 GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. 填寫：
   - **Application name**: `Stock Calendar`
   - **Homepage URL**: `http://localhost:3000`（開發用）
   - **Authorization callback URL**: `https://<你的-supabase-project-ref>.supabase.co/auth/v1/callback`
     > 在 Supabase Dashboard → Authentication → Providers → GitHub 可找到此 URL
3. 建立後記下 **Client ID** 與 **Client Secret**

#### B. 在 Supabase 啟用 GitHub Provider

1. Supabase Dashboard → **Authentication** → **Providers** → **GitHub**
2. 開啟 **Enable Sign in with GitHub**
3. 填入 GitHub OAuth App 的 Client ID 與 Client Secret
4. 儲存

#### C. 設定 Redirect URL

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL** 設為 `http://localhost:3000`（開發用）
3. **Redirect URLs** 新增：
   - `http://localhost:3000/auth/callback`
   - `https://你的網域.vercel.app/auth/callback`（部署後）

---

## 第二步：本地環境建置

### 2.1 安裝依賴

```bash
# 確認已安裝 Node.js 18+
node -v

# 安裝套件
npm install
```

### 2.2 設定環境變數

```bash
# 複製範例檔
cp .env.local.example .env.local
```

編輯 `.env.local`，填入 Supabase 專案資訊：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> 在 Supabase Dashboard → **Settings** → **API** 可找到 URL 與 anon key。

### 2.3 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)，使用 GitHub 登入即可開始使用。

---

## 第三步：使用流程

1. **登入** — 使用 GitHub 帳號登入
2. **設定券商** — 點擊右上角「券商」，新增您的券商名稱（元大、富邦等）
3. **記錄資產** — 點擊右上角 **+** 按鈕，輸入各券商今日總資產，系統自動加總
4. **查看月曆** — 中央月曆顯示每日資產與漲跌（紅漲 / 綠跌 / 灰平）
5. **切換視角** — 下拉選單可切換「總資產」或「單一券商」
6. **趨勢圖** — 月曆下方折線圖連動顯示資產成長曲線

---

## 第四步：部署

### 方案 A：Vercel（推薦）

1. 將程式碼推送到 GitHub Repository
2. 前往 [https://vercel.com](https://vercel.com)，Import 該 Repository
3. 在 Vercel 專案設定中加入環境變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://你的網域.vercel.app`
4. 部署完成後，回到 Supabase 更新 Redirect URLs 與 GitHub OAuth App 的 callback URL

### 方案 B：GitHub Pages

1. 修改 `next.config.ts`，取消註解：

```ts
output: "export",
basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/stock-calendar",
```

2. 設定環境變數 `NEXT_PUBLIC_BASE_PATH=/stock-calendar`（與 repo 名稱一致）
3. 執行 `npm run build`，將 `out/` 目錄部署到 GitHub Pages

> 注意：GitHub Pages 為靜態部署，OAuth callback 需透過 client-side 處理。建議優先使用 Vercel。

---

## 專案結構

```
stock-calendar/
├── supabase/
│   └── schema.sql          # 資料庫建立語法（含 RLS）
├── src/
│   ├── app/
│   │   ├── auth/callback/  # OAuth 回調
│   │   ├── login/          # 登入頁
│   │   ├── layout.tsx
│   │   ├── page.tsx        # 主畫面（需登入）
│   │   └── globals.css
│   ├── components/
│   │   ├── Dashboard.tsx   # 主控台
│   │   ├── Header.tsx      # 頂部列（含 + 按鈕）
│   │   ├── ViewSelector.tsx # 總資產 / 券商下拉選單
│   │   ├── Calendar.tsx    # 月曆模組
│   │   ├── TrendChart.tsx  # 折線圖
│   │   ├── EntryModal.tsx  # 資產輸入 Modal
│   │   └── BrokerManager.tsx # 券商管理
│   ├── lib/
│   │   ├── supabase/       # Supabase 客戶端
│   │   └── utils.ts        # 漲跌計算工具
│   └── types/
│       └── index.ts
├── .env.local.example
├── package.json
└── README.md
```

---

## 漲跌顏色規則（台股慣例）

| 狀態 | 顏色 |
|------|------|
| 漲（> 0） | 紅色底色 |
| 跌（< 0） | 綠色底色 |
| 持平 / 無前日資料 | 灰色底色 |

---

## 常見問題

**Q: 登入後跳轉失敗？**
確認 Supabase Redirect URLs 與 GitHub OAuth callback URL 設定正確。

**Q: 看不到資料？**
確認已在 SQL Editor 執行 `schema.sql`，且 RLS 政策已建立。

**Q: 同一天重複輸入？**
系統使用 upsert，同一天再次儲存會覆蓋舊資料。

---

## License

MIT
