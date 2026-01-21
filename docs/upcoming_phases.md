# Upcoming Phases - Investment App

**Last Updated:** 2026-01-21

---

## Progress Summary

| Phase | Name | Priority | Status | Description |
|-------|------|----------|--------|-------------|
| 1 | Auto Refresh Testing | High | Pending | Test and enable Vercel Cron for scheduled price updates |
| 2 | Portfolio Snapshots | Medium | ✅ Completed | Review and test historical snapshot functionality |
| 3 | CSV Parser Expansion | Medium | Pending | Evaluate next parsers (Wise, Revolut, Fidelity) |
| 4 | Content: Value ETF Article | Low | Pending | Draft article on AI investment backlash and value ETF rotation |
| 5 | Research: SimpleFIN | Low | Pending | Bank data integration for U.S. developers |

---

## Phase 1: Auto Refresh Testing

Test and enable scheduled background price updates via Vercel Cron.

### Reference

- [Auto Refresh Documentation](./api/auto-refresh.md)

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| Add `CRON_SECRET` to Vercel environment | ⬜ Pending | Generate with `openssl rand -hex 32` |
| Configure Vercel Cron in `vercel.json` | ⬜ Pending | Recommended: `0 */4 * * *` (every 4 hours) |
| Test endpoint manually with cURL | ⬜ Pending | `curl -H "Authorization: Bearer $CRON_SECRET"` |
| Verify cron execution in Vercel dashboard | ⬜ Pending | Settings > Cron Jobs |
| Monitor first few automated runs | ⬜ Pending | Check logs for errors |

### Vercel Cron Configuration

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

### Expected Outcome

- Prices automatically refresh every 4 hours
- Price Status indicator shows "Fresh" (green) for all portfolios
- No manual intervention required for price updates

---

## Phase 2: Portfolio Snapshots ✅

**Status:** Completed (2026-01-21)

Reviewed and tested the historical portfolio snapshot functionality. Fixed a critical bug in currency conversion.

### Completed Tasks

| Task | Status | Notes |
|------|--------|-------|
| Understand snapshot logic | ✅ Done | Reviewed `snapshot-service.ts` |
| Test snapshot creation | ✅ Done | Created manual snapshot, verified calculation |
| Review performance chart | ✅ Done | Chart displays correctly |
| Fix exchange rate bug | ✅ Done | Was querying by "USD" string instead of currency record ID |

### Bug Fixed

**Issue:** `createTodaySnapshot()` queried exchange rates with `fromCurrencyId: "USD"` (literal string) instead of the actual currency record ID (CUID).

**Impact:** Non-USD cash holdings (KWD, EUR, GBP, CHF) were not converted, causing incorrect valuations. Example: 90,000 KWD was valued at $90,000 instead of $290,322.

**Fix:** Now looks up USD currency record first, then queries exchange rates by actual ID.

### Snapshot Calculation Summary

| Component | Calculation |
|-----------|-------------|
| Securities | `quantity × latestPrice` from price history |
| CASH.USD | Direct quantity value |
| CASH.{other} | `quantity ÷ exchangeRate` (converts to USD) |
| No price available | Falls back to cost basis |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/portfolio/snapshot-service.ts` | Snapshot creation and retrieval logic (fixed) |
| `src/components/portfolio/performance-chart.tsx` | Performance visualization UI |
| `src/app/api/portfolio/[id]/history/route.ts` | History API endpoint |
| `scripts/backfill-snapshots.mjs` | Generate historical snapshots |

### Answers to Questions

| Question | Answer |
|----------|--------|
| How are snapshots created? | Manual via "Create Snapshot" button; could be automated via cron |
| What data is captured? | totalValue, costBasis, cashValue, gainLoss, gainLossPct |
| Performance calculation? | Compares snapshots over selected period (1M, 3M, 6M, 1Y, YTD, ALL) |
| Auto-generate via cron? | Recommended - could add to price refresh cron job |

---

## Phase 3: CSV Parser Expansion

Review the CSV parser roadmap and evaluate next parsers to implement.

### Reference

- [CSV Parser Roadmap](./csv-parsing/roadmap.md)

### Current Support

| Institution | Type | Status |
|-------------|------|--------|
| Interactive Brokers | Brokerage | ✅ Supported |
| Charles Schwab | Brokerage | ✅ Supported |
| Chase Bank | Bank | ✅ Supported |
| Bank of America | Bank | ✅ Supported |
| NBK (Kuwait) | Bank | ✅ Supported |

### High Priority Candidates

| Institution | Type | Why |
|-------------|------|-----|
| **Wise** | Fintech | #1 multi-currency platform for nomads |
| **Revolut** | Fintech | 45M users, comprehensive international features |
| **Fidelity** | Brokerage | Major US brokerage, popular with expats |

### Tasks

| Task | Status |
|------|--------|
| Review current roadmap priorities | ⬜ Pending |
| Research Wise CSV export format | ⬜ Pending |
| Research Revolut CSV export format | ⬜ Pending |
| Decide next parser to implement | ⬜ Pending |

---

## Phase 4: Content - AI Investment Backlash Article

Draft an article exploring the AI investment backlash and the rise of value ETF rotation strategies.

### Research Topics

| Topic | Notes |
|-------|-------|
| AI/Tech sector overvaluation concerns | Market sentiment shift |
| Value ETF performance vs growth | Rotation patterns |
| Diversification strategies | Portfolio allocation insights |
| Historical sector rotation parallels | Dot-com, 2022 tech correction |

### Article Outline (Draft)

1. **Introduction** - The AI investment frenzy and signs of fatigue
2. **The Case for Value** - Why investors are rotating to value ETFs
3. **ETF Comparison** - Growth vs value performance metrics
4. **Portfolio Implications** - How to position for uncertainty
5. **Conclusion** - Balanced approach to sector exposure

### Target

| Field | Value |
|-------|-------|
| Category | MARKET_ANALYSIS or PORTFOLIO_STRATEGY |
| Tier | FREE |
| Estimated Length | 1,500-2,000 words |

---

## Phase 5: Research - SimpleFIN and Bank Data Aggregation

Research bank data integration options for U.S. developers, focusing on SimpleFIN and the broader aggregation landscape.

### Overview

SimpleFIN is a bank data aggregation service that provides a simpler alternative to Plaid for accessing bank transaction data.

### Research Questions

| Question | Notes |
|----------|-------|
| What is SimpleFIN? | API service for bank data access |
| How does it compare to Plaid? | Pricing, coverage, ease of use |
| What banks are supported? | Coverage for target user base |
| Integration complexity | API documentation, SDK availability |
| Cost structure | Pricing for small apps vs enterprise |
| Privacy/security model | Data handling practices |

### Aggregation Landscape

| Provider | Type | Notes |
|----------|------|-------|
| **Plaid** | Market leader | Expensive, comprehensive |
| **SimpleFIN** | Alternative | Simpler, potentially cheaper |
| **Finicity** (Mastercard) | Enterprise | Visa competitor |
| **Yodlee** | Legacy | Acquired by Envestnet |
| **MX** | Open finance | Focus on data enhancement |
| **Akoya** | Bank-owned | Direct API connections |

### Potential Use Cases

- Automatic transaction import (replace manual CSV)
- Real-time balance updates
- Categorization and insights
- Budget tracking integration

### Output

Research document summarizing findings and recommendation for whether to pursue integration.

---

## Dependencies Summary

| Phase | Dependencies |
|-------|--------------|
| Auto Refresh Testing | `CRON_SECRET` environment variable |
| Portfolio Snapshots | None (existing functionality) |
| CSV Parser Expansion | Sample CSV files from target institutions |
| Content Article | Research and writing time |
| SimpleFIN Research | API documentation review |

---

