/**
 * Public Ticker API Endpoint
 * Returns cached stock quotes for the landing page ticker
 * Cache: 5 minutes in-memory
 */

import { NextResponse } from "next/server";

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

// Ticker symbols to display
const TICKER_SYMBOLS = [
  "SPY", "QQQ", "DIA", "AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"
];

const CRYPTO_SYMBOLS = ["BTC", "ETH"];

// In-memory cache
let cachedData: TickerData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface TickerData {
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

async function fetchQuote(symbol: string): Promise<TickerData | null> {
  try {
    const url = `${FMP_BASE_URL}/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return null;

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].price > 0) {
      const quote = data[0];
      return {
        symbol,
        price: quote.price,
        change: quote.change || 0,
        changePercent: quote.changesPercentage || quote.changePercentage || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchAllQuotes(): Promise<TickerData[]> {
  if (!FMP_API_KEY) {
    return FALLBACK_DATA;
  }

  const results: TickerData[] = [];

  // Fetch stock quotes
  for (const symbol of TICKER_SYMBOLS) {
    const quote = await fetchQuote(symbol);
    if (quote) {
      results.push(quote);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // Fetch crypto quotes (using USD suffix)
  for (const symbol of CRYPTO_SYMBOLS) {
    const quote = await fetchQuote(`${symbol}USD`);
    if (quote) {
      results.push({ ...quote, symbol }); // Use original symbol without USD
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // If we got less than half the expected results, use fallback
  if (results.length < (TICKER_SYMBOLS.length + CRYPTO_SYMBOLS.length) / 2) {
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
