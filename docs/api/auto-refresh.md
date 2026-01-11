# Auto Refresh - Scheduled Price Updates

**Last Updated:** 2026-01-08

---

## Overview

The Auto Refresh feature provides scheduled background price updates for all portfolios. Instead of requiring users to manually click "Refresh Prices," the system can automatically fetch updated prices on a configurable schedule.

---

## Technical Architecture

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| Cron API Endpoint | `src/app/api/cron/refresh-prices/route.ts` | HTTP endpoint triggered by scheduler |
| Batch Refresh Service | `src/lib/prices/batch-refresh.ts` | Core logic for processing portfolios |
| Price Status Component | `src/components/portfolio/price-status.tsx` | UI indicator showing price freshness |
| Portfolio Model | `prisma/schema.prisma` | `lastPriceRefresh` field for tracking |

### Data Flow

```
Scheduler (Vercel Cron / External)
         │
         ▼
┌─────────────────────────────┐
│  /api/cron/refresh-prices   │
│  (Authentication Check)     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  batchRefreshAllPrices()    │
│  - Get portfolios (oldest   │
│    refresh first)           │
│  - Process up to 50         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  For each portfolio:        │
│  - refreshAccountPrices()   │
│  - 2s delay between accounts│
│  - Update lastPriceRefresh  │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  PriceSnapshot records      │
│  (stored in database)       │
└─────────────────────────────┘
```

---

## API Reference

### Cron Endpoint

**Endpoint:** `GET /api/cron/refresh-prices` or `POST /api/cron/refresh-prices`

**Authentication:** Bearer token via `CRON_SECRET` environment variable

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "portfoliosProcessed": 5,
  "accountsProcessed": 12,
  "pricesUpdated": 45,
  "pricesErrored": 2,
  "pricesSkipped": 8,
  "startTime": "2026-01-08T14:00:00.000Z",
  "endTime": "2026-01-08T14:02:30.000Z",
  "duration": 150000,
  "details": [
    {
      "portfolioId": "clx...",
      "portfolioName": "Retirement",
      "userId": "clx...",
      "accountsProcessed": 3,
      "pricesUpdated": 15,
      "pricesErrored": 0,
      "pricesSkipped": 2
    }
  ]
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized"
}
```

---

## Batch Refresh Service

### Functions

#### `batchRefreshAllPrices()`

Refreshes prices for all active portfolios, prioritizing those that haven't been refreshed recently.

```typescript
import { batchRefreshAllPrices } from "@/lib/prices/batch-refresh"

const result = await batchRefreshAllPrices()
console.log(`Processed ${result.portfoliosProcessed} portfolios`)
console.log(`Updated ${result.pricesUpdated} prices in ${result.duration}ms`)
```

**Configuration:**
- `MAX_PORTFOLIOS_PER_RUN`: 50 portfolios per execution
- `DELAY_BETWEEN_ACCOUNTS_MS`: 2000ms (2 seconds) between accounts

#### `refreshPortfolioPricesWithTimestamp(portfolioId)`

Refreshes prices for a single portfolio and updates the `lastPriceRefresh` timestamp.

```typescript
import { refreshPortfolioPricesWithTimestamp } from "@/lib/prices/batch-refresh"

const result = await refreshPortfolioPricesWithTimestamp("portfolio-id")
```

#### `getPortfoliosNeedingRefresh(hoursThreshold)`

Returns portfolios where `lastPriceRefresh` is null or older than the threshold.

```typescript
import { getPortfoliosNeedingRefresh } from "@/lib/prices/batch-refresh"

// Get portfolios not refreshed in the last 4 hours
const portfolios = await getPortfoliosNeedingRefresh(4)
```

---

## Rate Limiting

The service respects external API rate limits:

| Provider | Limit | Strategy |
|----------|-------|----------|
| FMP (Primary) | Varies by tier | 200ms delay between symbols |
| Alpha Vantage (Fallback) | 5 calls/min | 5s delay when used |

**Account Processing:**
- 2-second delay between each account to spread API calls
- Portfolios processed sequentially
- Maximum 50 portfolios per cron run

---

## Price Status Indicator

### Visual States

| State | Color | Condition | Description |
|-------|-------|-----------|-------------|
| Fresh | Green | < 4 hours | Prices are current |
| Stale | Yellow | 4-24 hours | Prices may need refresh |
| Warning | Red | > 24 hours | Prices are outdated |
| Unknown | Gray | Never refreshed | No price data yet |

### Usage

```tsx
import { PriceStatus, PriceStatusCompact } from "@/components/portfolio"

// Full badge with icon
<PriceStatus lastRefresh={portfolio.lastPriceRefresh} />

// Compact text-only version
<PriceStatusCompact lastRefresh={portfolio.lastPriceRefresh} />
```

---

## Enabling Scheduled Refresh

### Step 1: Set Environment Variable

Add `CRON_SECRET` to your environment:

**Development (`.env.local`):**
```bash
CRON_SECRET=your-secure-random-string-here
```

**Production (Vercel Dashboard):**
1. Go to your project settings
2. Navigate to Environment Variables
3. Add `CRON_SECRET` with a secure random value

**Generate a secure secret:**
```bash
openssl rand -hex 32
```

### Step 2: Configure Vercel Cron

Add to `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-prices",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

**Schedule Options:**

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 4 hours | `0 */4 * * *` | Recommended for most users |
| Every 2 hours | `0 */2 * * *` | More frequent updates |
| Every 6 hours | `0 */6 * * *` | Lower API usage |
| Daily at midnight | `0 0 * * *` | Minimal API usage |
| Weekdays only (market hours) | `0 9,12,16 * * 1-5` | 9am, 12pm, 4pm EST |

### Step 3: Deploy

Deploy your application to Vercel. The cron job will automatically start running on the configured schedule.

### Step 4: Verify

Check the Vercel dashboard under **Settings > Cron Jobs** to see:
- Last execution time
- Next scheduled run
- Execution logs

---

## Manual Triggering

### Via cURL

```bash
curl -X GET https://your-domain.com/api/cron/refresh-prices \
  -H "Authorization: Bearer your-cron-secret"
```

### Via Script

```bash
# scripts/trigger-refresh.sh
#!/bin/bash
curl -X POST http://localhost:3000/api/cron/refresh-prices \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Alternative Schedulers

### Upstash QStash

If you need more flexible scheduling:

```bash
pnpm add @upstash/qstash
```

```typescript
import { Client } from "@upstash/qstash"

const client = new Client({ token: process.env.QSTASH_TOKEN })

await client.publishJSON({
  url: "https://your-domain.com/api/cron/refresh-prices",
  headers: {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
  },
  delay: "4h",
  retries: 3,
})
```

### GitHub Actions

```yaml
# .github/workflows/refresh-prices.yml
name: Refresh Prices
on:
  schedule:
    - cron: '0 */4 * * *'
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger price refresh
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/refresh-prices \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## Monitoring

### Logs

View cron execution logs:

```bash
# PM2 logs (self-hosted)
pm2 logs investment-app | grep "Cron:"

# Vercel logs
vercel logs --follow
```

### Metrics to Track

- `portfoliosProcessed`: Number of portfolios updated per run
- `pricesUpdated`: Successful price fetches
- `pricesErrored`: Failed price fetches (API errors, rate limits)
- `pricesSkipped`: Cash holdings and unsupported asset types
- `duration`: Total execution time in milliseconds

---

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Verify `CRON_SECRET` is set correctly in both environment and request header
- Check for trailing whitespace in the secret

**Timeout Errors**
- The endpoint has a 5-minute timeout (`maxDuration: 300`)
- If processing more than 50 portfolios, increase the schedule frequency

**Rate Limit Errors**
- Check FMP/Alpha Vantage API quotas
- Increase delay between accounts if needed
- Consider upgrading API tier for higher limits

**No Prices Updated**
- Verify holdings have valid symbols (not CASH.* or custom symbols)
- Check that price API keys are configured (`FMP_API_KEY`, `ALPHA_VANTAGE_API_KEY`)

---

## Database Schema

```prisma
model Portfolio {
  // ... existing fields
  lastPriceRefresh DateTime?  // Last time prices were refreshed
}
```

The `lastPriceRefresh` field is automatically updated:
- After each successful cron batch refresh
- After manual "Refresh Prices" button click
- Returned in API responses for UI display
