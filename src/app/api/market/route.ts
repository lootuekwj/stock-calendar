import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/0050.TW?range=7d&interval=1d",
      { cache: "no-store" }
    );
    
    if (!response.ok) throw new Error("無法取得 Yahoo Finance 資料");
    
    const data = await response.json();
    const result = data.chart.result[0];
    
    const timestamps = result.timestamp;
    const closePrices = result.indicators.quote[0].close;
    
    const upsertData = [];
    let lastValidPrice = null;

    // 找出這段時間內最後一個有效的價格，作為今日尚未結算時的防護機制
    for (let i = 0; i < closePrices.length; i++) {
      if (closePrices[i] !== null && closePrices[i] !== undefined) {
        lastValidPrice = closePrices[i];
      }
    }

    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      const dateString = date.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
      
      let price = closePrices[i];
      // 防護邏輯：如果當天收盤價為 null (Yahoo 尚未結算完成)，則自動採用前一日有效收盤價
      if (price === null || price === undefined) {
        price = lastValidPrice;
      }

      if (price !== null && price !== undefined) {
        upsertData.push({
          snapshot_date: dateString,
          symbol: "0050.TW",
          price: Number(price.toFixed(2)),
        });
      }
    }

    if (upsertData.length > 0) {
      const { error } = await supabase
        .from("market_snapshots")
        .upsert(upsertData, { onConflict: "snapshot_date,symbol" });

      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: "0050 真實價格同步成功", 
      data: upsertData 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}