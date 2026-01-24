/**
 * StockTicker Component
 * LED-style scrolling stock ticker for landing page
 * Fetches data from /api/ticker with static fallback
 */

"use client";

import { useEffect, useState } from "react";
import { TickerItem } from "./ticker-item";

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// Static fallback data
const FALLBACK_DATA: TickerData[] = [
  { symbol: "SPY", price: 452.30, change: 2.45, changePercent: 0.54 },
  { symbol: "QQQ", price: 385.20, change: -1.85, changePercent: -0.48 },
  { symbol: "DIA", price: 352.15, change: 1.20, changePercent: 0.34 },
  { symbol: "AAPL", price: 189.50, change: -1.20, changePercent: -0.63 },
  { symbol: "MSFT", price: 378.90, change: 3.45, changePercent: 0.92 },
  { symbol: "GOOGL", price: 141.25, change: 0.85, changePercent: 0.60 },
  { symbol: "NVDA", price: 495.80, change: 12.30, changePercent: 2.54 },
  { symbol: "TSLA", price: 248.50, change: -4.20, changePercent: -1.66 },
  { symbol: "BTC", price: 67234.00, change: 1420.50, changePercent: 2.15 },
  { symbol: "ETH", price: 3245.80, change: -45.20, changePercent: -1.37 },
];

export function StockTicker() {
  const [tickerData, setTickerData] = useState<TickerData[]>(FALLBACK_DATA);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const response = await fetch("/api/ticker");
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            setTickerData(result.data);
          }
        }
      } catch {
        // Keep using fallback data
      }
    }

    fetchTicker();
    // Refresh every 30 minutes (matches server cache duration)
    const interval = setInterval(fetchTicker, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ticker-wrapper w-full bg-zinc-900 py-3 overflow-hidden">
      <div className="animate-ticker flex whitespace-nowrap">
        {/* Duplicate content for seamless loop */}
        {[...tickerData, ...tickerData].map((item, index) => (
          <TickerItem
            key={`${item.symbol}-${index}`}
            symbol={item.symbol}
            price={item.price}
            changePercent={item.changePercent}
          />
        ))}
      </div>
    </div>
  );
}
