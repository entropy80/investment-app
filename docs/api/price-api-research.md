# Stock Price API Research

**Date:** 2025-12-29
**Purpose:** Evaluate free and low-cost stock price APIs for the investment-app

---

## Current Setup

| Provider | Status | Issue |
|----------|--------|-------|
| Financial Modeling Prep (FMP) | **Not working** | `/stable/quote` endpoint requires premium subscription |
| Alpha Vantage | **Working (fallback)** | 5 calls/min limit, 25 calls/day on free tier |

**Current Workaround:** All prices fetched via Alpha Vantage with 5-second delay between calls.

---

## TODO: Code Cleanup

> **REMINDER:** Remove the FMP debug logging from `src/lib/prices/fmp-service.ts` once the fetch prices feature is tested further and confirmed stable.
>
> Lines to remove:
> ```typescript
> console.log(`FMP failed for ${symbol}, trying Alpha Vantage...`);
> console.log(`Alpha Vantage result for ${symbol}: price=${result.price}, error=${result.error || 'none'}`);
> ```

---

## API Comparison

### Tier 1: Best Free Options

| Provider | Free Tier Limit | Rate Limit | Best For |
|----------|-----------------|------------|----------|
| **Finnhub** | Unlimited | 60 calls/min | Best overall free option |
| **Twelve Data** | 800 calls/day | 8 calls/min | Real-time + crypto + forex |
| **FMP** | 250 calls/day | N/A | Fundamentals, financials |

### Tier 2: Limited Free Options

| Provider | Free Tier Limit | Rate Limit | Notes |
|----------|-----------------|------------|-------|
| Alpha Vantage | 25 calls/day | 5 calls/min | Very limited, slow |
| Marketstack | 100 calls/month | 5 calls/sec | End-of-day only on free |
| Polygon.io | N/A | 5 calls/min | Acquired by Massive.com |

### Discontinued

| Provider | Status |
|----------|--------|
| IEX Cloud | Shut down August 2024 |
| Yahoo Finance API | Shut down 2017 (unofficial wrappers exist) |

---

## Detailed Provider Analysis

### 1. Finnhub (Recommended)

**Website:** https://finnhub.io

| Aspect | Details |
|--------|---------|
| Free Tier | 60 API calls/minute (30 calls/second internal cap) |
| Data | Stocks, forex, crypto, fundamentals, news, earnings |
| Coverage | US markets, some international |
| Real-time | Yes (US stocks) |

**Pros:**
- Most generous free tier (60 calls/min vs 5 calls/min for others)
- WebSocket support for real-time streaming
- Company fundamentals, news, earnings calendars
- No daily limit on free tier

**Cons:**
- Limited international coverage on free tier
- Some premium endpoints require paid plans

**API Example:**
```bash
# Stock quote
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_API_KEY"

# Response
{
  "c": 150.25,    # Current price
  "d": 2.50,      # Change
  "dp": 1.69,     # Percent change
  "h": 151.00,    # High
  "l": 148.50,    # Low
  "o": 149.00,    # Open
  "pc": 147.75    # Previous close
}
```

**Pricing:**
- Free: 60 calls/min
- All-in-one: $49.99/month (unlimited calls, all data)

---

### 2. Twelve Data

**Website:** https://twelvedata.com

| Aspect | Details |
|--------|---------|
| Free Tier | 800 calls/day, 8 calls/minute |
| Data | Stocks, forex, crypto, ETFs, indices |
| Coverage | Global exchanges |
| Real-time | Yes |

**Pros:**
- Good balance of limits and features
- Global market coverage
- Technical indicators included
- WebSocket streaming (trial on free)

**Cons:**
- 800/day limit can be restrictive
- Some markets require paid plans

**API Example:**
```bash
# Stock quote
curl "https://api.twelvedata.com/quote?symbol=AAPL&apikey=YOUR_API_KEY"
```

**Pricing:**
- Free: 800 calls/day
- Basic: $12/month (12,000 calls/day)
- Pro: $79/month (96,000 calls/day)

---

### 3. Financial Modeling Prep (FMP)

**Website:** https://site.financialmodelingprep.com

| Aspect | Details |
|--------|---------|
| Free Tier | 250 calls/day |
| Data | Stocks, financials, fundamentals, SEC filings |
| Coverage | US markets (global requires paid) |
| Real-time | Limited on free |

**Pros:**
- Excellent for financial statements and fundamentals
- SEC filings, earnings, dividends
- 5 years historical data on free

**Cons:**
- `/stable/quote` endpoint requires premium (current issue)
- Only 250 calls/day
- US-only on free tier

**Note:** The current FMP API key works for some endpoints but not `/stable/quote`. Consider upgrading to Starter ($22/month) for full quote access.

**Pricing:**
- Free: 250 calls/day, US only
- Starter: $22/month (10,000 calls/day)
- Premium: $52/month (50,000 calls/day)

---

### 4. Alpha Vantage (Current Fallback)

**Website:** https://www.alphavantage.co

| Aspect | Details |
|--------|---------|
| Free Tier | 25 calls/day, 5 calls/minute |
| Data | Stocks, forex, crypto, technical indicators |
| Coverage | Global |
| Real-time | 15-min delayed on free |

**Pros:**
- Wide symbol coverage (Vanguard ETFs work well)
- Technical indicators
- Forex and crypto

**Cons:**
- Very limited: 25 calls/day is extremely restrictive
- 5 calls/min requires long delays
- 15-minute delayed data

**Current Usage:** We use 5-second delays between calls to stay within rate limits. With 10 symbols, this takes ~50 seconds total.

**Pricing:**
- Free: 25 calls/day
- Premium: $49.99/month (unlimited)

---

### 5. Marketstack

**Website:** https://marketstack.com

| Aspect | Details |
|--------|---------|
| Free Tier | 100 calls/month |
| Data | Stocks, ETFs, indices |
| Coverage | 70+ global exchanges |
| Real-time | No (end-of-day only on free) |

**Pros:**
- Global exchange coverage
- Simple REST API

**Cons:**
- Only 100 calls/MONTH (very limited)
- No real-time on free tier

**Pricing:**
- Free: 100 calls/month
- Basic: $9.99/month (10,000 calls/month)

---

## Recommendation

### Immediate Fix (Free)

**Switch primary provider from FMP to Finnhub:**

1. Sign up at https://finnhub.io
2. Get free API key
3. Update `fmp-service.ts` to use Finnhub as primary
4. Keep Alpha Vantage as fallback

**Benefits:**
- 60 calls/min vs 5 calls/min (12x faster)
- No daily limit vs 25 calls/day
- Price refresh would take ~2 seconds instead of ~50 seconds

### Implementation Changes

```typescript
// New primary: Finnhub
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

async function fetchFinnhubQuote(symbol: string): Promise<PriceResult> {
  const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  return {
    symbol,
    price: data.c,           // current price
    change: data.d,          // change
    changePercent: data.dp,  // change percent
    source: "finnhub",
    timestamp: new Date(),
  };
}
```

### Long-term (Paid)

If the app grows, consider:

| Option | Cost | Benefit |
|--------|------|---------|
| Finnhub All-in-one | $49.99/mo | Unlimited calls, all data |
| Twelve Data Pro | $79/mo | 96,000 calls/day, global |
| FMP Premium | $52/mo | 50,000 calls/day, fundamentals |

---

## Environment Variables to Add

```bash
# .env.local
FINNHUB_API_KEY="your_finnhub_key"
```

---

## References

- [Finnhub Pricing](https://finnhub.io/pricing)
- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [Twelve Data Pricing](https://twelvedata.com/pricing)
- [Alpha Vantage Premium](https://www.alphavantage.co/premium/)
- [FMP Pricing](https://site.financialmodelingprep.com/pricing-plans)
- [Marketstack Pricing](https://marketstack.com/pricing)
- [10 Best FREE Stock APIs in 2025 | Coinmonks](https://medium.com/coinmonks/free-stock-apis-de8f13619911)
- [Top 5 Stock Market Data API Free Tools | DEV Community](https://dev.to/williamsmithh/top-5-stock-market-data-api-free-tools-for-developers-in-2025-3601)

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-29 | Initial research document created |
