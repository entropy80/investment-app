# Investment App - Technical Reference

**Last Updated:** 2026-01-09

A personal investment portfolio management application built with Next.js, featuring CSV import from brokerages, real-time price tracking, multi-currency display, and FIFO tax lot tracking for realized gains.

## Deployment

| Environment | Hosting | Database | URL |
|-------------|---------|----------|-----|
| Production | Vercel | Neon PostgreSQL 17 | https://your-domain.com |
| Development | Local/PM2 | PostgreSQL 17 (localhost) | http://localhost:3000 |

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Data Model](#data-model)
5. [API Reference](#api-reference)
6. [File Structure](#file-structure)
7. [CSV Import](#csv-import)
8. [Price Integration](#price-integration)
9. [Tax Lot Tracking](#tax-lot-tracking)
10. [Portfolio Value Calculation](#portfolio-value-calculation)
11. [Future Development](#future-development)

### Related Documentation

- [Currency Model](./api/currency-model.md) - Multi-currency system reference (schema, rationale, UI best practices)
- [Changelog](./CHANGELOG.md) - Version history and release notes

---

## Overview

The investment-app allows users to:

- Create and manage multiple investment portfolios
- Import transaction history from Charles Schwab and Interactive Brokers
- Track holdings with real-time prices
- View unrealized and realized gains/losses
- Multi-currency support with automatic USD conversion for portfolio totals
- Display values in USD, KWD, GBP, EUR, CHF
- Filter closed positions from Accounts and Holdings views
- Track tax lots using FIFO method for capital gains reporting

### Current Data Summary

| Metric | Value |
|--------|-------|
| Total Transactions | — |
| Active Holdings | — |
| Closed Positions | — |
| Tax Lots Created | — |
| Total Realized Gain | — |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.1.1 |
| Runtime | Node.js v24 |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth with 2FA, Password Reset |
| UI | React 19, Tailwind CSS, Radix UI |
| Charts | Recharts 3.x |
| MDX | next-mdx-remote 5.x, remark-gfm 4.x |
| Package Manager | pnpm |

---

## Features

### Completed Features

| Feature | Description |
|---------|-------------|
| Portfolio Management | Create portfolios with name, description, base currency |
| Account Organization | Multiple accounts per portfolio (Brokerage, Bank, Crypto) |
| CSV Import | Import from Schwab, IBKR, Chase Bank, NBK (Kuwait), and Bank of America with duplicate detection and multi-currency support |
| Holdings Tracking | Quantity, cost basis, average cost per unit with asset type validation |
| Cash Balance | Track cash in each currency (CASH.USD, CASH.KWD, etc.) with auto-conversion |
| Price Integration | Real-time prices via FMP and Alpha Vantage APIs |
| Multi-Currency | All values converted to USD; display in USD, KWD, GBP, EUR, CHF |
| Transactions Tab | View all transactions with filtering and pagination |
| Tax Lot Tracking | FIFO cost basis for realized gains calculation |
| Realized Gains | Track gains/losses with short-term/long-term classification |
| Closed Positions | Hide closed positions from Accounts and Holdings tabs |
| Demo Mode | Read-only demo at `/demo` with sample portfolio for unregistered users |
| Asset Type Validation | Backend validates symbols per asset type (CASH.XXX format, CRYPTO suffix stripping) |
| Non-Priceable Assets | REAL_ESTATE, OTHER, COMMODITY holdings skip price fetching |
| Budget Tracking | Spreadsheet-style yearly budget with 7 category groups, 35 subcategories, inline editing |
| Portfolio Visualization | Asset allocation donut chart with portfolio breakdown summary |
| Separate Cash Holdings | Securities and cash displayed in separate tables with currency conversion |
| Document Storage | Portfolio-scoped file storage for tax forms, statements, and imported CSVs via Vercel Blob |
| Transaction Category Filter | Filter transactions by 29 categories (income, expenses, transfers) |
| Bank Account Summary | Income vs expenses view with charts showing cash flow and savings rate |
| Tax Reports | Form 8949 and Schedule D generation with CSV export for tax filing |
| Historical Charts | Portfolio performance visualization over time with period selector |
| Password Reset | Forgot/reset password flow with email verification and secure tokens |

---

## Data Model

### Core Models

```
Portfolio
├── id, userId, name, description, baseCurrency
└── accounts[]

FinancialAccount
├── id, portfolioId, name, institution, accountType, currency
├── holdings[]
└── transactions[]

Holding
├── id, accountId, symbol, name, assetType
├── quantity, costBasis, avgCostPerUnit, currency
├── taxLots[]
└── priceHistory[]

PortfolioTransaction
├── id, accountId, holdingId, type, symbol
├── quantity, price, amount, fees, currency, date, notes
├── externalId, importedAt, importSource, importBatch
├── costBasisUsed, realizedGainLoss, holdingPeriodDays  # For SELL
└── taxLots[]

TaxLot
├── id, holdingId, transactionId
├── quantity, remaining, costBasis, costPerUnit
└── acquiredAt

PriceSnapshot
├── id, holdingId, price, change, changePercent
├── source, snapshotAt
└── open, high, low, previousClose, volume
```

### Transaction Types

```typescript
enum PortfolioTransactionType {
  BUY, SELL, DIVIDEND, REINVEST_DIVIDEND,
  INTEREST, TAX_WITHHOLDING, FEE,
  DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT,
  FOREX, ADJUSTMENT, OTHER
}
```

### Asset Types

```typescript
enum AssetType {
  STOCK, ETF, MUTUAL_FUND, BOND,
  CRYPTO, CASH, REAL_ESTATE, OTHER
}
```

---

## API Reference

### Portfolio Endpoints

```bash
# List all portfolios
GET /api/portfolio

# Get portfolio with accounts, holdings, summary
GET /api/portfolio/[id]

# Create portfolio
POST /api/portfolio
{ "name": "...", "description": "...", "baseCurrency": "USD" }

# Update portfolio
PUT /api/portfolio/[id]

# Delete portfolio
DELETE /api/portfolio/[id]
```

### Account Endpoints

```bash
# List accounts in portfolio
GET /api/portfolio/[id]/accounts

# Create account
POST /api/portfolio/[id]/accounts
{ "name": "...", "institution": "...", "accountType": "BROKERAGE" }

# Update/Delete account
PUT/DELETE /api/portfolio/[id]/accounts/[accountId]
```

### Transaction Endpoints

```bash
# Get transactions with filters
GET /api/portfolio/[id]/transactions
?type=BUY,SELL
&symbol=NVDA
&accountId=...
&startDate=2025-01-01
&endDate=2025-12-31
&hasFees=true
&limit=50
&offset=0
&includeMetadata=true
```

### Import Endpoints

```bash
# Import CSV (dry run or actual)
POST /api/portfolio/import
{
  "accountId": "...",
  "type": "broker",
  "brokerFormat": "schwab|ibkr|auto",
  "csvContent": "...",
  "dryRun": true,
  "currency": "USD"  # Optional, defaults to USD
}

# Rollback import batch
DELETE /api/portfolio/import
{ "batchId": "import-20251226..." }

# View import history
GET /api/portfolio/import?action=history&accountId=...
```

### Price Endpoints

```bash
# Get cached prices for portfolio holdings
GET /api/portfolio/prices?portfolioId=...

# Refresh prices from APIs
POST /api/portfolio/prices
{ "portfolioId": "..." }
```

### Tax Lot Endpoints

```bash
# Get realized gains summary
GET /api/portfolio/[id]/tax-lots?action=realized-gains
&year=2025

# Get tax lots for a holding
GET /api/portfolio/[id]/tax-lots?action=holding-lots&holdingId=...

# Backfill tax lots for portfolio
POST /api/portfolio/[id]/tax-lots
{ "action": "backfill" }
```

### Tax Report Endpoints

```bash
# Get available years with tax data
GET /api/portfolio/[id]/tax-report?action=years

# Generate tax report (JSON)
GET /api/portfolio/[id]/tax-report?year=2025

# Download Form 8949 CSV
GET /api/portfolio/[id]/tax-report?year=2025&format=csv
```

### History Endpoints

```bash
# Get portfolio history for charting
GET /api/portfolio/[id]/history?period=1M|3M|6M|1Y|YTD|ALL

# Create snapshot for today
POST /api/portfolio/[id]/history

# Get latest snapshot
GET /api/portfolio/[id]/history?action=latest
```

### Currency Endpoints

```bash
# Get available currencies
GET /api/currency?action=list

# Get exchange rates
GET /api/currency?action=rates&base=USD

# Convert amount
GET /api/currency?action=convert&from=USD&to=KWD&amount=1000

# Refresh rates from API
POST /api/currency
{ "base": "USD" }
```

---

## File Structure

### Core Application

```
src/
├── app/
│   ├── (dashboard)/dashboard/
│   │   ├── portfolio/[id]/page.tsx    # Portfolio detail page
│   │   └── settings/page.tsx          # User settings
│   └── api/
│       ├── portfolio/
│       │   ├── route.ts               # Portfolio CRUD
│       │   ├── [id]/
│       │   │   ├── route.ts           # Single portfolio
│       │   │   ├── accounts/          # Account management
│       │   │   ├── transactions/      # Transaction queries
│       │   │   └── tax-lots/          # Tax lot operations
│       │   ├── import/route.ts        # CSV import
│       │   └── prices/route.ts        # Price fetching
│       └── currency/route.ts          # Currency conversion
├── lib/
│   ├── portfolio/
│   │   ├── portfolio-service.ts       # Portfolio business logic
│   │   └── tax-lot-service.ts         # FIFO tax lot logic
│   ├── import/
│   │   ├── service.ts                 # Import orchestration
│   │   ├── dedupe.ts                  # Duplicate detection
│   │   ├── types.ts                   # Type definitions
│   │   └── parsers/
│   │       ├── schwab.ts              # Schwab CSV parser
│   │       ├── ibkr.ts                # IBKR CSV parser
│   │       ├── chase-bank.ts          # Chase Bank CSV parser
│   │       ├── nbk.ts                 # NBK (Kuwait) CSV parser
│   │       └── bofa.ts                # Bank of America CSV parser
│   ├── prices/
│   │   ├── fmp-service.ts             # FMP + Alpha Vantage
│   │   └── index.ts
│   ├── currency/
│   │   ├── currency-service.ts        # Exchange rate service
│   │   └── index.ts
│   └── tax/
│       ├── types.ts                   # Form 8949 and Schedule D types
│       ├── tax-report-service.ts      # Tax report generation
│       └── index.ts
├── components/
│   ├── portfolio/                     # Portfolio visualization
│   │   ├── asset-allocation-chart.tsx # Donut chart component
│   │   ├── portfolio-breakdown.tsx    # Summary breakdown
│   │   ├── portfolio-visualization.tsx # Main container
│   │   └── bank-summary.tsx           # Bank account income/expenses summary
│   ├── tax/                           # Tax report components
│   │   └── tax-report-view.tsx        # Tax Reports tab UI
│   └── ui/                            # Shared UI components
```

### Scripts

```
scripts/
├── backfill-tax-lots.mjs              # Backfill tax lots for existing data
├── recalculate-holdings.ts            # Recalculate holding quantities
├── query-docs.mjs                     # List documents in a portfolio
├── fetch-doc.mjs                      # Fetch and display document content
├── check-transactions.mjs             # Transaction summary by type
├── seed-demo-user.mjs                 # Create/reset demo user data
└── backfill-snapshots.mjs             # Generate historical portfolio snapshots
```

### Database

```
prisma/
├── schema.prisma                      # Database schema
└── migrations/                        # Migration history
```

---

## CSV Import

### Supported Brokers

| Broker | File Pattern | Auto-Detect |
|--------|--------------|-------------|
| Charles Schwab | `Individual_*_Transactions_*.csv` | Yes |
| Interactive Brokers | `U*.TRANSACTIONS.*.csv` | Yes |
| Chase Bank | Checking/Savings exports | Yes |
| NBK (Kuwait) | Savings/Checking exports | Yes |
| Bank of America | Checking/Savings exports | Yes |

### Multi-Currency Import

The import dialog includes a currency selector that allows importing transactions in any supported currency:

| Field | Description |
|-------|-------------|
| Transaction Currency | Currency code for all transactions in the import (e.g., USD, KWD, EUR) |

This enables users with multiple brokerage accounts in different currencies to import transactions correctly:

```
Example: User with US + Kuwaiti brokerage accounts
┌─────────────────────────────────────────────────┐
│ Import 1: Charles Schwab (USD)                  │
│   → Select currency: USD                        │
│   → Transactions stored with currency: USD      │
├─────────────────────────────────────────────────┤
│ Import 2: Kuwaiti Broker (KWD)                  │
│   → Select currency: KWD                        │
│   → Transactions stored with currency: KWD      │
│   → Holdings created with currency: KWD         │
└─────────────────────────────────────────────────┘
```

### Transaction Mapping

#### Schwab Actions

| Schwab Action | App Type |
|---------------|----------|
| Buy | BUY |
| Sell | SELL |
| Qualified Dividend | DIVIDEND |
| Reinvest Dividend | REINVEST_DIVIDEND |
| Reinvest Shares | BUY |
| NRA Tax Adj | TAX_WITHHOLDING |
| Credit Interest | INTEREST |
| MoneyLink Transfer | DEPOSIT |
| Journal | TRANSFER_IN / TRANSFER_OUT |

#### IBKR Actions

| IBKR Type | App Type |
|-----------|----------|
| Buy | BUY |
| Sell | SELL |
| Dividend | DIVIDEND |
| Credit Interest | INTEREST |
| Foreign Tax Withholding | TAX_WITHHOLDING |
| Forex Trade Component | FOREX |
| Adjustment | ADJUSTMENT |
| Deposit | DEPOSIT |
| Withdrawal | WITHDRAWAL |

#### Chase Bank Actions

| Chase Type | App Type |
|------------|----------|
| ACH_DEBIT | WITHDRAWAL |
| ACH_CREDIT | DEPOSIT |
| DEBIT_CARD | WITHDRAWAL |
| WIRE_INCOMING | TRANSFER_IN |
| WIRE_OUTGOING | TRANSFER_OUT |
| FEE_TRANSACTION | FEE |
| CHECK_DEPOSIT | DEPOSIT |
| CHECK_PAID | WITHDRAWAL |

**Opening Balance Calculation:**
Bank statements contain partial transaction history. The Chase parser automatically:
1. Extracts the final balance from the CSV's Balance column
2. Calculates the implied opening balance (`Final Balance - Sum of Transactions`)
3. Creates an ADJUSTMENT transaction to ensure correct cash balance

**Auto-Categorization:**
The parser includes 35+ merchant patterns for automatic transaction categorization:
- Netflix, Spotify, Hulu → STREAMING
- Costco, Safeway, Instacart → GROCERIES
- Amazon Prime → MEMBERSHIPS
- Uber, Lyft, Gas stations → FUEL
- And more...

#### NBK (Kuwait) Bank Actions

| NBK Description | App Type |
|-----------------|----------|
| Debit-NBK Transfer | TRANSFER_OUT |
| Credit-NBK Transfer | TRANSFER_IN |
| Debit-Bank Transfer | TRANSFER_OUT (SWIFT) |
| Credit Int | INTEREST |
| Debit - Bank Transfer Fee | FEE |
| Debit- MOB | TRANSFER_OUT (Mobile SWIFT) |
| Debit- WAMD Transfer | TRANSFER_OUT |

**Opening Balance Calculation:**
Same as Chase - extracts final balance from CSV, calculates implied opening balance, creates ADJUSTMENT transaction.

**KWD Currency:**
NBK parser uses 3 decimal places (Kuwait Dinar standard).

### Duplicate Detection

Uses SHA256 hash of: `date + symbol + transactionType + amount + quantity`

```javascript
// If externalId matches existing → Skip
// If hash matches existing in same account → Skip
// Otherwise → Import as new
```

### Cash Balance Tracking

Cash tracked as `CASH.{currency}` holdings:

- **Adds:** Deposits, sells, dividends, interest, transfers in
- **Subtracts:** Withdrawals, buys, fees, taxes, transfers out
- **Excluded:** Reinvested dividends (immediately used to buy shares)
- **Excluded:** TDA legacy transfers (TD Ameritrade migration accounting entries)

### Holding Validation Rules

The backend validates holdings based on asset type to ensure data consistency:

| Asset Type | Symbol Format | Validation |
|------------|---------------|------------|
| CASH | `CASH.{CURRENCY}` | Must start with "CASH.", currency code validated against database |
| CRYPTO | Letters only | Auto-strips "USD" suffix (e.g., BTCUSD → BTC) |
| STOCK, ETF, MUTUAL_FUND, BOND | Letters, dots, hyphens | Validated via regex, max 20 chars |
| REAL_ESTATE | Any | Property identifier, no price fetching |
| OTHER, COMMODITY | Any | No price fetching |

**Non-Priceable Assets:** REAL_ESTATE, OTHER, and COMMODITY asset types skip the price fetch API to avoid errors. A warning banner is shown in the UI when adding these types.

### Automatic Tax Lot Processing

As of 2025-12-27, the import service automatically processes tax lots after importing transactions:

1. Creates `TaxLot` records for BUY and REINVEST_DIVIDEND transactions
2. Consumes tax lots (FIFO) for SELL transactions
3. Populates `realizedGainLoss`, `costBasisUsed`, and `holdingPeriodDays` on SELL transactions

This eliminates the need to manually run the backfill script after imports.

---

## Price Integration

### Data Sources

| Source | Status | Rate Limit |
|--------|--------|------------|
| Financial Modeling Prep (FMP) | **Premium required** | N/A |
| Alpha Vantage | Primary (fallback) | 5 sec delay |

**Note (2025-12-29):** FMP's `/stable/quote` endpoint now requires a premium subscription. All price fetches currently use Alpha Vantage as the fallback.

### Price Refresh

- Manual refresh via "Refresh Prices" button
- Takes ~50 seconds for 10 symbols (5 sec delay between Alpha Vantage calls)
- Prices cached in `PriceSnapshot` table
- Delay reduced from 12 sec to 5 sec to stay within nginx proxy timeout (60 sec)

### Error Handling

The price service includes robust error handling for external API responses:

| Scenario | Handling |
|----------|----------|
| Non-JSON response (HTML error pages) | Detected via Content-Type header check |
| JSON parse failure | Caught and returns graceful error |
| Rate limit errors | Returns error with rate limit message |
| API timeout | Falls back gracefully, continues with next symbol |

This prevents crashes when APIs return unexpected HTML responses (maintenance pages, captchas, etc.).

---

## Tax Lot Tracking

### FIFO Method

1. **BUY Transaction:** Creates a TaxLot with quantity, cost basis, acquisition date
2. **SELL Transaction:** Consumes tax lots in FIFO order (oldest first)
3. **Realized Gain:** `Proceeds - Cost Basis` per lot consumed
4. **Holding Period:** Days between acquisition and sale date

### Tax Classification

| Holding Period | Classification |
|----------------|----------------|
| < 365 days | Short-Term (ST) |
| ≥ 365 days | Long-Term (LT) |

### Fields on SELL Transactions

| Field | Description |
|-------|-------------|
| `costBasisUsed` | Total cost basis consumed |
| `realizedGainLoss` | Gain or loss amount |
| `holdingPeriodDays` | Weighted average days held |

### Example: NVDA

| Date | Type | Qty | Price | Amount |
|------|------|-----|-------|--------|
| 2025-05-19 | BUY | 15 | $133.73 | -$2,006 |
| 2025-06-29 | BUY | 25 | $157.80 | -$3,945 |
| 2025-09-08 | BUY | 40 | $169.42 | -$6,777 |
| 2025-11-09 | SELL | 80 | $195.06 | +$15,605 |

**Result:** Realized Gain: $2,877 (+22.6%), 105 days (Short-Term)

---

## Portfolio Value Calculation

### Total Value Components

The portfolio's Total Value is calculated in USD as the base currency:

| Component | Calculation |
|-----------|-------------|
| Securities | `quantity × current price` (prices fetched in USD) |
| Cash (USD) | `quantity` (CASH.USD holdings) |
| Cash (Other) | `quantity × exchange rate` (CASH.KWD, CASH.GBP, etc. converted to USD) |

### Multi-Currency Cash Conversion

Non-USD cash holdings are automatically converted using stored exchange rates:

```
CASH.KWD 98,000 × 3.2757 (KWD→USD) = $320,996
CASH.GBP 15,000 × 1.3572 (GBP→USD) = $20,358
CASH.USD 275,616                    = $275,616
─────────────────────────────────────────────
Total Cash (in USD):                  $616,970
```

### Display Currency Conversion

When a non-USD display currency is selected:

1. All values are first calculated in USD (base)
2. Final totals are converted to display currency using exchange rates
3. Both USD and converted values are shown in the UI

### Exchange Rate Sources

- **Frankfurter API** - Free, no API key required
- Only `USD→X` rates stored in `ExchangeRate` table
- Inverse rates (`X→USD`) calculated mathematically as `1 / rate` to ensure round-trip accuracy
- Manual refresh via `/api/currency` endpoint

---

## Future Development

### Planned Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Historical Price Charts | Medium | Performance tracking over time |
| Scheduled Price Refresh | Medium | Background job for auto-refresh |
| Tax Report Generation | Low | Schedule D, Form 8949 |
| Dividend Tracking | Low | Show dividends received per holding |

### Technical Debt

| Issue | Impact | Notes |
|-------|--------|-------|
| FMP premium required | All prices via Alpha Vantage | `/stable/quote` endpoint needs subscription |
| Alpha Vantage rate limits | ~50 sec for 10 symbols | 5 sec delay to avoid rate limits |
| Nginx proxy timeout | Max ~55 sec per request | Reduced delay from 12s to 5s as workaround |
| No automatic refresh | Manual refresh only | Consider background job |
| No historical prices | Only current prices stored | |

### Known Issues

| Issue | Workaround |
|-------|------------|
| IBKR CSV header issues | First 10 lines may need manual `,,` fix |
| Price refresh timeout (>10 symbols) | Nginx 60s timeout; reduce holdings or increase proxy timeout |
| Alpha Vantage rate limits | May fail if refreshing too frequently; wait 1 min between refreshes |

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Database migrations
pnpm prisma migrate dev
pnpm prisma generate

# Run backfill scripts
node scripts/backfill-tax-lots.mjs
```

### PM2 Process Management

```bash
pm2 list                    # View status
pm2 logs investment-app     # View logs
pm2 restart investment-app  # Restart app
pm2 stop investment-app     # Stop app
```

---

## Content Management (Articles)

The application includes a CMS for managing articles. Articles can be created via the admin UI or seeded from MDX files via CLI.

### Article Categories

| Category | Description |
|----------|-------------|
| BROKER_REVIEW | Reviews of brokerages and financial institutions |
| INVESTING_GUIDE | Guides and tutorials on investing |
| BASICS | Beginner-friendly educational content |
| MARKET_ANALYSIS | Market trends and analysis |
| PORTFOLIO_STRATEGY | Portfolio management strategies |
| NEWS | News and updates |

### Article Tiers

| Tier | Access |
|------|--------|
| FREE | Public, no login required |
| AUTHENTICATED | Members only (requires login) |

### Creating Articles via CLI

Articles can be seeded from MDX files in the `articles/` directory:

```bash
# Seed a single article
node scripts/seed-article.mjs articles/my-article.mdx

# View help and available options
node scripts/seed-article.mjs
```

### MDX File Format

Create an MDX file in the `articles/` directory with frontmatter:

```mdx
---
title: "Article Title"
slug: "article-url-slug"
excerpt: "Brief description for cards and SEO"
category: "INVESTING_GUIDE"
tags: ["tag1", "tag2"]
tier: "FREE"
featured: false
coverImage: "https://..."
author: "admin@localhost"
---

Article content in Markdown/MDX format...

## Section Header

Regular markdown content with **bold**, *italic*, and [links](https://example.com).

| Tables | Are | Supported |
|--------|-----|-----------|
| Data   | Here| Too       |
```

### Article Directory Structure

```
articles/
├── _template.mdx                                    # Template for new articles
├── best-banks-brokerages-digital-nomads-expats-2025.mdx
└── ... (future articles)
```

### Frontmatter Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| title | Yes | - | Article title |
| slug | No | Auto from title | URL slug |
| excerpt | Yes | - | Brief description (1-2 sentences) |
| category | Yes | - | One of the valid categories |
| tags | No | [] | Array of tag strings |
| tier | No | FREE | FREE or AUTHENTICATED |
| featured | No | false | Show in featured section |
| coverImage | No | null | URL to cover image |
| author | No | admin@localhost | Author email |

---

## Environment Variables

Required in `.env.local`:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Price APIs
FMP_API_KEY="..."
ALPHA_VANTAGE_API_KEY="..."
```

---

## Contributing

1. Create feature branch from `main`
2. Implement changes with tests
3. Update this documentation if needed
4. Submit pull request

---

## References

- [FMP API Documentation](https://site.financialmodelingprep.com/developer/docs)
- [Alpha Vantage Documentation](https://www.alphavantage.co/documentation/)
- [Frankfurter Exchange Rates](https://www.frankfurter.app/)
