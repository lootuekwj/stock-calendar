import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 初始化後端專用的 Supabase Client
// 使用環境變數中的 URL 與 Anon Key (Next.js 伺服器端環境變數讀取)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // 1. 呼叫 Yahoo Finance API 抓取 0050.TW 近 5 天的歷史報價
    // (抓 5 天是為了防止跨時區或假日的資料漏接)
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/0050.TW?range=5d&interval=1d"
    );
    
    if (!response.ok) throw new Error("無法取得 Yahoo Finance 資料");
    
    const data = await response.json();
    const result = data.chart.result[0];
    
    const timestamps = result.timestamp; // 包含時間戳記的陣列
    const closePrices = result.indicators.quote[0].close; // 包含收盤價的陣列
    
    const upsertData = [];

    // 2. 將資料整理成我們 Supabase 需要的格式
    for (let i = 0; i < timestamps.length; i++) {
      const price = closePrices[i];
      // 排除掉沒有收盤價的無效資料 (例如盤中未產生收盤價時)
      if (price !== null && price !== undefined) {
        // 將 Unix 時間戳轉換為 YYYY-MM-DD 格式 (台灣時區)
        const date = new Date(timestamps[i] * 1000);
        const dateString = date.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
        
        upsertData.push({
          snapshot_date: dateString,
          symbol: "0050.TW",
          price: Number(price.toFixed(2)), // 只取到小數點後兩位
        });
      }
    }

    // 3. 將整理好的資料寫入 Supabase (若日期重複則自動覆蓋更新)
    const { error } = await supabase
      .from("market_snapshots")
      .upsert(upsertData, { onConflict: "snapshot_date,symbol" });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "0050 收盤價同步成功！", 
      data: upsertData 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}