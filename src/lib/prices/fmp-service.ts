/**
 * Price Data Service
 * Fetches real-time stock and crypto prices from multiple sources
 * Primary: Financial Modeling Prep (FMP)
 * Fallback: Alpha Vantage (for symbols blocked on FMP free tier)
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

/**
 * FMP Quote Response
 */
interface FMPQuote {
  symbol: string;
  name?: string;
  price: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  avgVolume?: number;
  exchange?: string;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

/**
 * FMP Crypto Quote Response
 */
interface FMPCryptoQuote {
  symbol: string;
  name?: string;
  price: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  volume?: number;
  timestamp?: number;
}

/**
 * Normalized price result
 */
export interface PriceResult {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  source: string;
  timestamp: Date;
  error?: string;
}

/**
 * Check if API key is configured
 */
export function isConfigured(): boolean {
  return !!FMP_API_KEY;
}

/**
 * Fetch a single stock/ETF quote from FMP
 */
async function fetchSingleQuote(symbol: string): Promise<PriceResult> {
  try {
    const url = `${FMP_BASE_URL}/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        symbol,
        price: 0,
        source: "fmp",
        timestamp: new Date(),
        error: `API error: ${response.status}`,
      };
    }

    // Check Content-Type to avoid parsing HTML as JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {
        symbol,
        price: 0,
        source: "fmp",
        timestamp: new Date(),
        error: "API returned non-JSON response (possible rate limit or maintenance)",
      };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return {
        symbol,
        price: 0,
        source: "fmp",
        timestamp: new Date(),
        error: "Failed to parse API response",
      };
    }

    if (Array.isArray(data) && data.length > 0 && data[0].price > 0) {
      const quote = data[0];
      return {
        symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercentage || quote.changesPercentage,
        source: "fmp",
        timestamp: new Date(),
      };
    }

    return {
      symbol,
      price: 0,
      source: "fmp",
      timestamp: new Date(),
      error: "Quote not found",
    };
  } catch (error) {
    return {
      symbol,
      price: 0,
      source: "fmp",
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch a single stock/ETF quote from Alpha Vantage (fallback)
 */
async function fetchAlphaVantageQuote(symbol: string): Promise<PriceResult> {
  if (!ALPHA_VANTAGE_API_KEY) {
    return {
      symbol,
      price: 0,
      source: "alphavantage",
      timestamp: new Date(),
      error: "Alpha Vantage API key not configured",
    };
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        symbol,
        price: 0,
        source: "alphavantage",
        timestamp: new Date(),
        error: `API error: ${response.status}`,
      };
    }

    // Check Content-Type to avoid parsing HTML as JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {
        symbol,
        price: 0,
        source: "alphavantage",
        timestamp: new Date(),
        error: "API returned non-JSON response (possible rate limit or maintenance)",
      };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return {
        symbol,
        price: 0,
        source: "alphavantage",
        timestamp: new Date(),
        error: "Failed to parse API response",
      };
    }

    // Check for rate limit or error messages
    if (data.Note || data["Error Message"]) {
      return {
        symbol,
        price: 0,
        source: "alphavantage",
        timestamp: new Date(),
        error: data.Note || data["Error Message"],
      };
    }

    const quote = data["Global Quote"];
    if (quote && quote["05. price"]) {
      const price = parseFloat(quote["05. price"]);
      const change = parseFloat(quote["09. change"] || "0");
      const changePercent = parseFloat((quote["10. change percent"] || "0%").replace("%", ""));

      return {
        symbol,
        price,
        change,
        changePercent,
        source: "alphavantage",
        timestamp: new Date(),
      };
    }

    return {
      symbol,
      price: 0,
      source: "alphavantage",
      timestamp: new Date(),
      error: "Quote not found",
    };
  } catch (error) {
    return {
      symbol,
      price: 0,
      source: "alphavantage",
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch stock/ETF quotes with FMP primary, Alpha Vantage fallback
 */
export async function fetchStockQuotes(symbols: string[]): Promise<PriceResult[]> {
  if (!FMP_API_KEY && !ALPHA_VANTAGE_API_KEY) {
    throw new Error("No price API configured");
  }

  if (symbols.length === 0) {
    return [];
  }

  const results: PriceResult[] = [];

  for (const symbol of symbols) {
    // Try FMP first
    let result = await fetchSingleQuote(symbol);

    // If FMP failed and Alpha Vantage is configured, try fallback
    if ((result.error || result.price <= 0) && ALPHA_VANTAGE_API_KEY) {
      console.log(`FMP failed for ${symbol}, trying Alpha Vantage...`);
      result = await fetchAlphaVantageQuote(symbol);
      console.log(`Alpha Vantage result for ${symbol}: price=${result.price}, error=${result.error || 'none'}`);
    } else if (symbols.length > 1) {
      // Small delay for FMP
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    results.push(result);

    // Rate limit delay - only between calls, not after the last one
    // Alpha Vantage: 5 calls/min = 12sec, but we use 5sec to stay within proxy timeout
    // This may occasionally hit rate limits but keeps requests under 60 seconds
    const isLastSymbol = symbols.indexOf(symbol) === symbols.length - 1;
    if (!isLastSymbol && result.source === "alphavantage") {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}

/**
 * Fetch crypto quotes from FMP (one at a time for free tier)
 * FMP uses format like BTCUSD, ETHUSD
 */
export async function fetchCryptoQuotes(symbols: string[]): Promise<PriceResult[]> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY not configured");
  }

  if (symbols.length === 0) {
    return [];
  }

  // Fetch quotes sequentially to respect rate limits on free tier
  const results: PriceResult[] = [];
  for (const symbol of symbols) {
    // Convert to FMP crypto format (BTC -> BTCUSD)
    const cryptoSymbol = `${symbol}USD`;
    const result = await fetchSingleQuote(cryptoSymbol);

    // Map back to original symbol
    results.push({
      ...result,
      symbol,  // Use original symbol (BTC, not BTCUSD)
    });

    // Small delay to avoid rate limiting
    if (symbols.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Fetch prices for all holdings in an account
 */
// Asset types that don't have price API support
const NON_PRICEABLE_ASSET_TYPES = ["REAL_ESTATE", "OTHER", "COMMODITY"];

export async function refreshAccountPrices(accountId: string): Promise<{
  updated: number;
  errors: number;
  skipped: number;
  results: PriceResult[];
}> {
  // Get all holdings for the account
  const holdings = await prisma.holding.findMany({
    where: { accountId },
    select: {
      id: true,
      symbol: true,
      assetType: true,
      currency: true,
    },
  });

  // Separate by asset type
  const stockSymbols: string[] = [];
  const cryptoSymbols: string[] = [];
  const holdingMap = new Map<string, { id: string; currency: string }>();
  let skipped = 0;

  for (const holding of holdings) {
    // Skip cash holdings (value calculated from exchange rates)
    if (holding.symbol.startsWith("CASH.")) {
      skipped++;
      continue;
    }

    // Skip non-priceable asset types (require manual valuation)
    if (NON_PRICEABLE_ASSET_TYPES.includes(holding.assetType)) {
      skipped++;
      continue;
    }

    holdingMap.set(holding.symbol, { id: holding.id, currency: holding.currency });

    if (holding.assetType === "CRYPTO") {
      cryptoSymbols.push(holding.symbol);
    } else if (["STOCK", "ETF", "MUTUAL_FUND", "BOND"].includes(holding.assetType)) {
      stockSymbols.push(holding.symbol);
    }
  }

  // Fetch prices
  const [stockResults, cryptoResults] = await Promise.all([
    fetchStockQuotes(stockSymbols),
    fetchCryptoQuotes(cryptoSymbols),
  ]);

  const allResults = [...stockResults, ...cryptoResults];

  // Save to database
  let updated = 0;
  let errors = 0;

  for (const result of allResults) {
    const holdingInfo = holdingMap.get(result.symbol);
    if (!holdingInfo) continue;

    if (result.error || result.price <= 0) {
      errors++;
      continue;
    }

    try {
      await prisma.priceSnapshot.create({
        data: {
          holdingId: holdingInfo.id,
          price: new Prisma.Decimal(result.price),
          currency: holdingInfo.currency,
          source: result.source,
          snapshotAt: result.timestamp,
        },
      });
      updated++;
    } catch (error) {
      console.error(`Error saving price for ${result.symbol}:`, error);
      errors++;
    }
  }

  return { updated, errors, skipped, results: allResults };
}

/**
 * Fetch prices for all holdings in a portfolio
 */
export async function refreshPortfolioPrices(
  portfolioId: string,
  userId: string
): Promise<{
  updated: number;
  errors: number;
  skipped: number;
  results: PriceResult[];
}> {
  // Verify ownership
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        select: { id: true },
      },
    },
  });

  if (!portfolio) {
    throw new Error("Portfolio not found or access denied");
  }

  let totalUpdated = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  const allResults: PriceResult[] = [];

  for (const account of portfolio.accounts) {
    const result = await refreshAccountPrices(account.id);
    totalUpdated += result.updated;
    totalErrors += result.errors;
    totalSkipped += result.skipped;
    allResults.push(...result.results);
  }

  return {
    updated: totalUpdated,
    errors: totalErrors,
    skipped: totalSkipped,
    results: allResults,
  };
}

/**
 * Get the latest price for a holding
 */
export async function getLatestPrice(holdingId: string): Promise<{
  price: number;
  timestamp: Date;
  source: string;
} | null> {
  const snapshot = await prisma.priceSnapshot.findFirst({
    where: { holdingId },
    orderBy: { snapshotAt: "desc" },
  });

  if (!snapshot) {
    return null;
  }

  return {
    price: Number(snapshot.price),
    timestamp: snapshot.snapshotAt,
    source: snapshot.source || "unknown",
  };
}

/**
 * Get latest prices for multiple holdings
 */
export async function getLatestPrices(holdingIds: string[]): Promise<Map<string, {
  price: number;
  timestamp: Date;
  source: string;
}>> {
  const snapshots = await prisma.priceSnapshot.findMany({
    where: { holdingId: { in: holdingIds } },
    orderBy: { snapshotAt: "desc" },
    distinct: ["holdingId"],
  });

  const priceMap = new Map<string, { price: number; timestamp: Date; source: string }>();

  for (const snapshot of snapshots) {
    priceMap.set(snapshot.holdingId, {
      price: Number(snapshot.price),
      timestamp: snapshot.snapshotAt,
      source: snapshot.source || "unknown",
    });
  }

  return priceMap;
}
