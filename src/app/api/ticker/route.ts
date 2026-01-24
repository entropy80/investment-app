/**
 * Public Ticker API Endpoint
 * Returns cached stock quotes for the landing page ticker
 * Cache: 5 minutes in-memory
 *
 * Uses the shared price service which has Alpha Vantage fallback
 * when FMP fails (FMP /stable/quote requires premium subscription)
 */

import { NextResponse } from "next/server";
import { fetchStockQuotes, fetchCryptoQuotes } from "@/lib/prices/fmp-service";

// Ticker symbols to display
const TICKER_SYMBOLS = [
  "SPY", "QQQ", "DIA", "AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"
];

const CRYPTO_SYMBOLS = ["BTC", "ETH"];

// In-memory cache
let cachedData: TickerData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface TickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// Static fallback data (used when all API calls fail)
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

// Create a map for quick fallback lookup
const FALLBACK_MAP = new Map(FALLBACK_DATA.map(item => [item.symbol, item]));

async function fetchAllQuotes(): Promise<TickerData[]> {
  const results: TickerData[] = [];

  try {
    // Fetch stock quotes using shared service (has Alpha Vantage fallback)
    const stockResults = await fetchStockQuotes(TICKER_SYMBOLS);

    for (const result of stockResults) {
      if (result.price > 0 && !result.error) {
        results.push({
          symbol: result.symbol,
          price: result.price,
          change: result.change || 0,
          changePercent: result.changePercent || 0,
        });
      } else {
        // Use fallback for this specific symbol if API failed
        const fallback = FALLBACK_MAP.get(result.symbol);
        if (fallback) {
          results.push(fallback);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching stock quotes for ticker:", error);
    // Add stock fallbacks
    for (const symbol of TICKER_SYMBOLS) {
      const fallback = FALLBACK_MAP.get(symbol);
      if (fallback) results.push(fallback);
    }
  }

  try {
    // Fetch crypto quotes (FMP only, no Alpha Vantage fallback for crypto)
    const cryptoResults = await fetchCryptoQuotes(CRYPTO_SYMBOLS);

    for (const result of cryptoResults) {
      if (result.price > 0 && !result.error) {
        results.push({
          symbol: result.symbol,
          price: result.price,
          change: result.change || 0,
          changePercent: result.changePercent || 0,
        });
      } else {
        // Use fallback for this specific crypto if API failed
        const fallback = FALLBACK_MAP.get(result.symbol);
        if (fallback) {
          results.push(fallback);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching crypto quotes for ticker:", error);
    // Add crypto fallbacks
    for (const symbol of CRYPTO_SYMBOLS) {
      const fallback = FALLBACK_MAP.get(symbol);
      if (fallback) results.push(fallback);
    }
  }

  // If we got no results at all, return full fallback
  if (results.length === 0) {
    return FALLBACK_DATA;
  }

  return results;
}

export async function GET() {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return NextResponse.json({
      data: cachedData,
      cached: true,
      timestamp: cacheTimestamp,
    });
  }

  // Fetch fresh data
  const data = await fetchAllQuotes();

  // Update cache
  cachedData = data;
  cacheTimestamp = now;

  return NextResponse.json({
    data,
    cached: false,
    timestamp: now,
  });
}
