# Database Schema Overview

**Last Updated:** 2025-12-27
**Database:** PostgreSQL 17
**ORM:** Prisma

---

## Table of Contents

1. [Authentication Models](#authentication-models)
2. [Content Management Models](#content-management-models)
3. [System Models](#system-models)
4. [Currency & Exchange Rate Models](#currency--exchange-rate-models)
5. [Portfolio Tracking Models](#portfolio-tracking-models)
6. [Enums](#enums)
7. [Key Features](#key-features)
8. [Entity Relationship Diagram](#entity-relationship-diagram)

---

## Authentication Models

NextAuth v5 compatible authentication system.

| Model | Table Name | Purpose |
|-------|------------|---------|
| User | `users` | User accounts with roles and 2FA support |
| Account | `accounts` | OAuth provider accounts (Google, GitHub, etc.) |
| Session | `sessions` | Active user sessions |
| VerificationToken | `verification_tokens` | Email verification tokens |

### User

Primary user model with authentication and authorization.

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID primary key |
| name | String? | Display name |
| email | String | Unique email address |
| emailVerified | DateTime? | Email verification timestamp |
| password | String? | Hashed password (credentials provider) |
| role | UserRole | USER, ADMIN, or SUPER_ADMIN |
| twoFactorEnabled | Boolean | 2FA enabled flag |
| twoFactorSecret | String? | TOTP secret for 2FA |

**Relationships:**
- `portfolios[]` - User's investment portfolios
- `accounts[]` - OAuth provider connections
- `sessions[]` - Active sessions
- `notifications[]` - User notifications
- `auditLogs[]` - Activity logs
- `articles[]`, `videos[]`, `brokerReviews[]` - Authored content

---

## Content Management Models

| Model | Table Name | Purpose |
|-------|------------|---------|
| Article | `articles` | Educational articles (MDX content) |
| Video | `videos` | Embedded YouTube/Vimeo videos |
| BrokerReview | `broker_reviews` | Broker reviews with ratings |

### Article

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID primary key |
| title | String | Article title |
| slug | String | URL-friendly identifier (unique) |
| excerpt | Text | Short summary |
| content | Text | Full MDX content |
| category | ArticleCategory | Content category |
| tags | String[] | Tag array |
| requiredTier | SubscriptionTier | Access level (FREE or AUTHENTICATED) |
| published | Boolean | Publication status |
| featured | Boolean | Featured flag |
| readTime | Int? | Estimated read time (minutes) |

### BrokerReview

| Field | Type | Description |
|-------|------|-------------|
| brokerName | String | Broker name |
| overallRating | Float | Overall rating (1-5) |
| feesRating | Float | Fees rating |
| platformRating | Float | Platform rating |
| supportRating | Float | Support rating |
| pros | String[] | List of pros |
| cons | String[] | List of cons |
| affiliateLink | String? | Affiliate URL |

---

## System Models

| Model | Table Name | Purpose |
|-------|------------|---------|
| Notification | `notifications` | User notifications |
| AuditLog | `audit_logs` | Activity tracking |

### Notification

| Field | Type | Description |
|-------|------|-------------|
| type | NotificationType | INFO, SUCCESS, WARNING, ERROR, etc. |
| title | String | Notification title |
| message | Text | Notification body |
| link | String? | Optional action link |
| read | Boolean | Read status |
| readAt | DateTime? | When marked as read |

### AuditLog

| Field | Type | Description |
|-------|------|-------------|
| action | String | Action identifier (e.g., "user.login") |
| resource | String? | Resource type (e.g., "User") |
| resourceId | String? | Resource ID |
| metadata | Json? | Additional context |
| ipAddress | String? | Client IP |
| userAgent | String? | Browser/client info |

---

## Currency & Exchange Rate Models

| Model | Table Name | Purpose |
|-------|------------|---------|
| Currency | `currencies` | Supported currencies |
| ExchangeRate | `exchange_rates` | Historical exchange rates |

### Currency

| Field | Type | Description |
|-------|------|-------------|
| code | String | ISO 4217 code (USD, KWD, GBP, EUR, CHF) |
| name | String | Full name (US Dollar, Kuwaiti Dinar) |
| symbol | String? | Currency symbol ($, KD, £, €) |

### ExchangeRate

| Field | Type | Description |
|-------|------|-------------|
| fromCurrencyId | String | Source currency |
| toCurrencyId | String | Target currency |
| rate | Decimal(18,8) | Exchange rate |
| effectiveDate | Date | Valid date |
| source | String? | Rate source (frankfurter, manual) |

**Note:** Only `USD→X` rates are stored. Inverse rates (`X→USD`) are calculated mathematically as `1/rate` to ensure round-trip accuracy.

---

## Portfolio Tracking Models

| Model | Table Name | Purpose |
|-------|------------|---------|
| Portfolio | `portfolios` | Investment portfolio container |
| FinancialAccount | `financial_accounts` | Brokerage, bank, crypto accounts |
| Holding | `holdings` | Individual asset positions |
| PortfolioTransaction | `portfolio_transactions` | Buy/sell/dividend records |
| PriceSnapshot | `price_snapshots` | Historical price data |
| TaxLot | `tax_lots` | FIFO cost basis tracking |

### Portfolio

| Field | Type | Description |
|-------|------|-------------|
| userId | String | Owner user ID |
| name | String | Portfolio name (e.g., "Retirement") |
| description | Text? | Optional description |
| isDefault | Boolean | Default portfolio flag |
| baseCurrency | String | Base currency for reporting (default: USD) |

**Relationships:**
- `user` - Owner
- `accounts[]` - Financial accounts in this portfolio

### FinancialAccount

| Field | Type | Description |
|-------|------|-------------|
| portfolioId | String | Parent portfolio |
| name | String | Account name (e.g., "Fidelity IRA") |
| institution | String | Institution name (e.g., "Schwab") |
| accountType | AccountType | BROKERAGE, BANK, CRYPTO_EXCHANGE, etc. |
| currency | String | Account currency |
| isActive | Boolean | Active status |

**Relationships:**
- `portfolio` - Parent portfolio
- `holdings[]` - Positions in this account
- `transactions[]` - Transaction history

### Holding

| Field | Type | Description |
|-------|------|-------------|
| accountId | String | Parent account |
| symbol | String | Ticker (AAPL, BTC, CASH.USD) |
| name | String | Full name |
| assetType | AssetType | STOCK, ETF, CRYPTO, CASH, etc. |
| quantity | Decimal(18,8) | Current quantity |
| costBasis | Decimal(18,2)? | Total cost basis |
| avgCostPerUnit | Decimal(18,8)? | Average cost per unit |
| currency | String | Position currency |

**Unique Constraint:** One holding per symbol per account (`@@unique([accountId, symbol])`)

**Relationships:**
- `account` - Parent account
- `transactions[]` - Related transactions
- `priceHistory[]` - Price snapshots
- `taxLots[]` - FIFO tax lots

### PortfolioTransaction

| Field | Type | Description |
|-------|------|-------------|
| accountId | String | Account ID |
| holdingId | String? | Related holding (null for deposits) |
| type | PortfolioTransactionType | BUY, SELL, DIVIDEND, etc. |
| symbol | String? | Ticker symbol |
| quantity | Decimal(18,8)? | Transaction quantity |
| price | Decimal(18,8)? | Price per unit |
| amount | Decimal(18,2) | Total amount |
| fees | Decimal(18,2)? | Transaction fees |
| date | DateTime | Transaction date |

**Import Tracking:**

| Field | Type | Description |
|-------|------|-------------|
| externalId | String? | Hash for duplicate detection |
| importedAt | DateTime? | Import timestamp |
| importSource | String? | Source (schwab, ibkr, manual) |
| importBatch | String? | Batch ID for rollback |

**Realized Gains (SELL transactions):**

| Field | Type | Description |
|-------|------|-------------|
| costBasisUsed | Decimal(18,2)? | Cost basis consumed (FIFO) |
| realizedGainLoss | Decimal(18,2)? | Gain/loss amount |
| holdingPeriodDays | Int? | Average days held |

### PriceSnapshot

| Field | Type | Description |
|-------|------|-------------|
| holdingId | String | Related holding |
| price | Decimal(18,8) | Price value |
| currency | String | Price currency |
| source | String? | Data source (fmp, alphavantage) |
| snapshotAt | DateTime | Snapshot timestamp |

### TaxLot

FIFO cost basis tracking for capital gains calculation.

| Field | Type | Description |
|-------|------|-------------|
| holdingId | String | Related holding |
| transactionId | String | BUY transaction that created this lot |
| quantity | Decimal(18,8) | Original quantity |
| remaining | Decimal(18,8) | Remaining after partial sells |
| costBasis | Decimal(18,2) | Total cost for this lot |
| costPerUnit | Decimal(18,8) | Cost per unit |
| acquiredAt | DateTime | Purchase date (for tax classification) |

---

## Enums

### UserRole
```
USER        - Standard user
ADMIN       - Administrator
SUPER_ADMIN - Super administrator
```

### SubscriptionTier
```
FREE          - Accessible to everyone
AUTHENTICATED - Requires login
```

### NotificationType
```
INFO, SUCCESS, WARNING, ERROR, ACCOUNT, BILLING, SYSTEM
```

### ArticleCategory
```
BROKER_REVIEW, INVESTING_GUIDE, BASICS, MARKET_ANALYSIS,
PORTFOLIO_STRATEGY, NEWS
```

### VideoPlatform
```
YOUTUBE, VIMEO
```

### AccountType
```
BROKERAGE       - Stock/ETF brokerage
BANK            - Bank account
CRYPTO_EXCHANGE - Cryptocurrency exchange
RETIREMENT      - 401k, IRA, pension
REAL_ESTATE     - Property investments
OTHER
```

### AssetType
```
STOCK, ETF, MUTUAL_FUND, BOND, CRYPTO, CASH,
REAL_ESTATE, COMMODITY, OTHER
```

### PortfolioTransactionType
```
BUY, SELL, DIVIDEND, REINVEST_DIVIDEND, INTEREST,
DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT,
FEE, SPLIT, TAX_WITHHOLDING, FOREX, ADJUSTMENT, OTHER
```

---

## Key Features

### Decimal Precision
- **Quantities:** `Decimal(18, 8)` - Supports crypto decimals (0.00000001 BTC)
- **Amounts:** `Decimal(18, 2)` - Standard currency precision
- **Exchange Rates:** `Decimal(18, 8)` - High precision for conversions

### Cascade Deletes
```
User → Portfolio → FinancialAccount → Holding → TaxLot
                                    → PortfolioTransaction
                                    → PriceSnapshot
```

### Soft References
- `PortfolioTransaction.holdingId` uses `onDelete: SetNull`
- `AuditLog.userId` uses `onDelete: SetNull`

### Unique Constraints
- One holding per symbol per account: `@@unique([accountId, symbol])`
- One exchange rate per currency pair per date: `@@unique([fromCurrencyId, toCurrencyId, effectiveDate])`

### Indexes
Optimized for common queries:
- User lookups: `@@index([email])`
- Date-based queries: `@@index([date])`, `@@index([effectiveDate])`
- Symbol lookups: `@@index([symbol])`
- Import tracking: `@@index([externalId])`, `@@index([importBatch])`

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER                                        │
│  ┌──────────┐                                                           │
│  │   User   │                                                           │
│  └────┬─────┘                                                           │
│       │                                                                  │
│       ├──────────────┬──────────────┬──────────────┐                    │
│       │              │              │              │                    │
│       ▼              ▼              ▼              ▼                    │
│  ┌─────────┐   ┌─────────┐   ┌────────────┐  ┌──────────┐              │
│  │ Account │   │ Session │   │ Notification│  │ AuditLog │              │
│  └─────────┘   └─────────┘   └────────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           PORTFOLIO TRACKING                             │
│                                                                          │
│  User                                                                    │
│    │                                                                     │
│    ▼                                                                     │
│  ┌───────────┐                                                          │
│  │ Portfolio │                                                          │
│  └─────┬─────┘                                                          │
│        │                                                                 │
│        ▼                                                                 │
│  ┌──────────────────┐                                                   │
│  │ FinancialAccount │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│     ┌─────┴─────┐                                                       │
│     │           │                                                        │
│     ▼           ▼                                                        │
│ ┌─────────┐  ┌─────────────────────┐                                    │
│ │ Holding │  │ PortfolioTransaction│                                    │
│ └────┬────┘  └──────────┬──────────┘                                    │
│      │                   │                                               │
│  ┌───┴────┐              │                                              │
│  │        │              │                                               │
│  ▼        ▼              ▼                                               │
│ ┌────────┐ ┌─────────────┐                                              │
│ │ TaxLot │ │PriceSnapshot│                                              │
│ └────────┘ └─────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              CURRENCY                                    │
│                                                                          │
│  ┌──────────┐         ┌──────────────┐                                  │
│  │ Currency │◄───────►│ ExchangeRate │                                  │
│  └──────────┘         └──────────────┘                                  │
│                                                                          │
│  (USD, KWD, GBP, EUR, CHF)                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## References

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
