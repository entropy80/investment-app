# Currency Model - Technical Reference

**Last Updated:** 2026-01-05
**Status:** Stable

A comprehensive reference for the multi-currency system in the investment-app, covering database schema, design rationale, and UI implementation best practices.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Design Rationale](#design-rationale)
4. [Exchange Rate System](#exchange-rate-system)
5. [Value Calculation Flow](#value-calculation-flow)
6. [UI Best Practices](#ui-best-practices)
7. [Common Issues & Debugging](#common-issues--debugging)
8. [Code Reference](#code-reference)

---

## Overview

The investment-app supports multi-currency portfolios with holdings in USD, EUR, GBP, KWD, and CHF. The currency system follows a four-level hierarchy where:

- **Actual values** are stored at the holding and transaction level
- **Internal calculations** are normalized to USD
- **Display values** are converted to the user's preferred currency

### Key Principles

| Principle | Implementation |
|-----------|----------------|
| Ground truth at lowest level | Holdings and transactions store actual currency |
| USD as calculation base | All aggregations happen in USD |
| Display is separate from storage | User can view in any currency without affecting stored data |
| Round-trip accuracy | Only USD→X rates stored; inverses calculated mathematically |

---

## Database Schema

### Currency Fields by Table

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CURRENCY HIERARCHY                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   portfolios.baseCurrency     → Display preference (user-selected) │
│           ↑                                                         │
│   financial_accounts.currency → Display hint (account badge)        │
│           ↑                                                         │
│   holdings.currency           → Actual stored values                │
│           ↑                                                         │
│   portfolio_transactions.currency → Transaction ground truth        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Table Details

#### `portfolios`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| baseCurrency | String | "USD" | User's preferred display currency |

**Note:** Despite the name "baseCurrency", this field functions as a **display preference**. All internal calculations use USD. The user can change this anytime via the currency dropdown, and it persists across sessions.

#### `financial_accounts`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| currency | String | "USD" | Display hint / account badge |

**Note:** This field serves as a **display hint** to help users identify accounts (e.g., "UK Brokerage - GBP"). It does not affect calculations since holdings have their own currency field.

#### `holdings`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| currency | String | "USD" | Currency of costBasis and avgCostPerUnit |
| costBasis | Decimal | - | Total cost in holding's currency |
| avgCostPerUnit | Decimal | - | Cost per unit in holding's currency |

**This is where actual values live.** The currency field indicates what currency the numeric values are denominated in.

#### `portfolio_transactions`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| currency | String | "USD" | Currency of the transaction amount |
| amount | Decimal | - | Transaction amount in transaction's currency |
| price | Decimal | - | Price per unit in transaction's currency |

**Ground truth for each transaction.** The currency indicates the actual denomination of the transaction.

#### `currencies`

| Column | Type | Description |
|--------|------|-------------|
| code | String | ISO 4217 code (USD, EUR, GBP, KWD, CHF) |
| name | String | Full currency name |
| symbol | String? | Currency symbol ($, €, £, د.ك, CHF) |

**Supported currencies:** USD, EUR, GBP, KWD, CHF

#### `exchange_rates`

| Column | Type | Description |
|--------|------|-------------|
| fromCurrencyId | String | Always USD |
| toCurrencyId | String | Target currency |
| rate | Decimal | USD → Target rate |
| effectiveDate | DateTime | Date of rate |
| source | String | "frankfurter" or "manual" |

**Design decision:** Only USD→X rates are stored. Inverse rates (X→USD) are calculated as `1 / rate` to ensure round-trip accuracy.

---

## Design Rationale

### Why Currency at Each Level?

| Level | Field | Purpose | Essential? |
|-------|-------|---------|------------|
| Transaction | currency | Ground truth for transaction amounts | **Yes** |
| Holding | currency | Ground truth for cost basis values | **Yes** |
| Account | currency | Display hint / badge | No (convenience) |
| Portfolio | baseCurrency | User's display preference | No (preference) |

### Why Not Simplify?

The current model was considered for simplification (removing account/portfolio currency), but was kept because:

1. **Account.currency** provides useful UX - users can mentally organize accounts by their operating currency (e.g., "UK Brokerage - GBP")

2. **Portfolio.baseCurrency** provides session persistence - users don't need to re-select their display currency each time

The model is **solid where it matters** (holdings and transactions) and the container-level fields add convenience without causing issues.

### Why USD as Internal Base?

- **Consistency:** All aggregations use the same currency
- **Simplicity:** No need to pick a "main" currency per portfolio
- **API compatibility:** Most price APIs return USD prices
- **Math accuracy:** Single conversion point reduces floating-point errors

### Forex Transactions

Forex transactions inherently involve two currencies (e.g., exchange $1,000 USD for €920 EUR).

**Current approach:** Two separate transaction records

```
FOREX, -10000, USD  (money out)
FOREX, +9200,  EUR  (money in)
```

**Rationale:** This approach:
- Requires no schema changes
- Works with existing import logic
- Maintains accurate cash balances per currency
- Matches how brokers export forex transactions (IBKR uses two line items)

---

## Exchange Rate System

### Rate Storage

Rates are fetched from Frankfurter API and stored as **USD → X only**:

```
Stored rates (exchange_rates table):
- USD → KWD: 0.3053 (1 USD = 0.3053 KWD)
- USD → GBP: 0.7368 (1 USD = 0.7368 GBP)
- USD → EUR: 0.9615 (1 USD = 0.9615 EUR)
- USD → CHF: 0.8912 (1 USD = 0.8912 CHF)
```

### Inverse Rate Calculation

To convert X → USD, calculate the inverse mathematically:

```typescript
// KWD → USD: 1 / 0.3053 = 3.2754
const rateToUSD = 1 / storedRate
```

**Why not store both directions?** Storing both USD→KWD and KWD→USD rates causes floating-point drift. Round-trip conversions (1,000 KWD → USD → KWD) would yield 1,000.07 KWD instead of exactly 1,000.

### Cross-Currency Conversion

To convert X → Y (e.g., GBP → KWD):

```typescript
// Convert via USD as intermediary
const valueInUSD = valueInGBP * (1 / rateUSDtoGBP)
const valueInKWD = valueInUSD * rateUSDtoKWD
```

### Client-Side Rate Object

The frontend transforms stored rates for easier use:

```typescript
// API returns: [{ fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.7368 }, ...]
// Client transforms to: { USD: 1, GBP: 1.3572, KWD: 3.2754, ... }
// These are X → USD rates (multiply to convert TO USD)

const exchangeRates: Record<string, number> = { USD: 1 }
for (const rateObj of apiRates) {
  exchangeRates[rateObj.toCurrency] = 1 / rateObj.rate  // Invert for X→USD
}
```

---

## Value Calculation Flow

### Server-Side (Portfolio Summary)

**File:** `src/lib/portfolio/portfolio-service.ts`

```
Step 1: Calculate all values in USD
├── Securities with API price → Already in USD
├── Cash holdings (CASH.KWD) → quantity × (X→USD rate)
└── Non-priceable assets → avgCostPerUnit × (holding.currency→USD rate)

Step 2: Aggregate totals in USD
├── totalValue (sum of all holdings)
├── totalCostBasis (sum of all cost bases)
└── totalGainLoss (totalValue - totalCostBasis)

Step 3: Convert to display currency (if baseCurrency ≠ USD)
├── converted.totalValue = totalValue × (USD→baseCurrency rate)
├── converted.totalCostBasis = totalCostBasis × (USD→baseCurrency rate)
└── converted.exchangeRate = rate used
```

### Client-Side (Display)

```
Step 1: Receive summary from API
├── summary.totalValue (USD)
├── summary.converted?.totalValue (baseCurrency, if applicable)
└── summary.baseCurrency

Step 2: Display appropriate value
├── If hasConversion → show converted value with baseCurrency symbol
└── If no conversion → show USD value with USD symbol

Step 3: Show original currency below (optional)
└── Smaller text showing USD value when displaying converted
```

### Conversion Example

```
User has:
- Portfolio baseCurrency: KWD
- Holding: AAPL stock, 10 shares
- API price: $150 USD

Calculation:
1. Current value in USD: 10 × $150 = $1,500
2. Convert to display: $1,500 × 0.3053 = KWD 457.95
3. UI shows:
   - Primary: KWD 457.950 (display currency)
   - Secondary: $1,500.00 (original USD)
```

---

## UI Best Practices

### Pattern 1: Dual Currency Display

When showing converted values, always display both the converted amount and the original:

```
┌────────────────────────────────┐
│  KWD 457.950                   │  ← Primary: display currency (large)
│  $1,500.00                     │  ← Secondary: original currency (small, muted)
└────────────────────────────────┘
```

**Implementation:**

```tsx
function CurrencyDisplay({ value, nativeCurrency, displayCurrency, exchangeRates }) {
  const needsConversion = displayCurrency !== nativeCurrency
  const convertedValue = needsConversion
    ? value * exchangeRates[nativeCurrency] / exchangeRates[displayCurrency]
    : value

  return (
    <div>
      <p className="text-2xl font-bold">
        {formatCurrency(convertedValue, displayCurrency)}
      </p>
      {needsConversion && (
        <p className="text-xs text-muted-foreground">
          {formatCurrency(value, nativeCurrency)}
        </p>
      )}
    </div>
  )
}
```

### Pattern 2: Summary Cards

Portfolio summary cards (Total Value, Cost Basis, Gain/Loss):

```tsx
// Use server-calculated converted values when available
const baseCurrency = displaySummary.baseCurrency || 'USD'
const hasConversion = displaySummary.converted && baseCurrency !== 'USD'

const displayValue = hasConversion
  ? displaySummary.converted.totalValue
  : displaySummary.totalValue

<Card>
  <CardHeader>Total Value</CardHeader>
  <CardContent>
    <p className="text-2xl font-bold">
      {formatCurrency(displayValue, baseCurrency)}
    </p>
    {hasConversion && (
      <p className="text-xs text-muted-foreground">
        {formatCurrency(displaySummary.totalValue, 'USD')}
      </p>
    )}
  </CardContent>
</Card>
```

### Pattern 3: Account Cards

Account cards should convert from account currency to display currency:

```tsx
const baseCurrency = portfolio.baseCurrency || 'USD'
const accountSummary = calculateAccountSummary(account)  // Returns values in account.currency

// Convert to display currency
const needsConversion = baseCurrency !== account.currency
const conversionRate = needsConversion
  ? (exchangeRates[account.currency] || 1) / (exchangeRates[baseCurrency] || 1)
  : 1
const displayTotalValue = accountSummary.totalValue * conversionRate

<Card>
  <CardHeader>
    {account.name}
    <Badge>{account.currency}</Badge>  {/* Display hint badge */}
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold">
      {formatCurrency(displayTotalValue, baseCurrency)}
    </p>
    {needsConversion && (
      <p className="text-xs text-muted-foreground">
        {formatCurrency(accountSummary.totalValue, account.currency)}
      </p>
    )}
  </CardContent>
</Card>
```

### Pattern 4: Holdings Table

Holdings table columns should respect display currency:

| Column | Source | Notes |
|--------|--------|-------|
| Symbol | holding.symbol | No conversion |
| Quantity | holding.quantity | No conversion |
| Price | priceInfo.price or fallback | Convert to display currency |
| Value | quantity × price | Convert to display currency |
| Cost Basis | holding.costBasis | Convert from holding.currency |
| Gain/Loss | value - costBasis | Calculated in display currency |

### Pattern 5: Allocation Charts

For pie charts and allocation breakdowns:

```tsx
// Use converted allocation when available
const displayAllocation = summary?.converted?.assetAllocation ?? summary?.assetAllocation

displayAllocation.map(item => (
  <div key={item.assetType}>
    <span>{item.assetType}</span>
    <span>{formatCurrency(item.value, baseCurrency)}</span>
    <span>{item.percentage.toFixed(1)}%</span>
  </div>
))
```

### Pattern 6: Realized Gains

Apply exchange rate to realized gains when displaying:

```tsx
const baseCurrency = portfolio.baseCurrency || 'USD'
const exchangeRate = displaySummary?.converted?.exchangeRate || 1

const displayGain = baseCurrency !== 'USD'
  ? realizedGain * exchangeRate
  : realizedGain

<Card>
  <CardHeader>Total Realized Gain</CardHeader>
  <CardContent>
    <p className="text-2xl font-bold">
      {formatCurrency(displayGain, baseCurrency)}
    </p>
    {baseCurrency !== 'USD' && (
      <p className="text-xs text-muted-foreground">
        {formatCurrency(realizedGain, 'USD')}
      </p>
    )}
  </CardContent>
</Card>
```

### Pattern 7: Cash Holdings

For cash holdings (CASH.USD, CASH.KWD), **always extract currency from symbol**:

```typescript
// CORRECT: Extract from symbol
const cashCurrency = holding.symbol.split('.')[1] || 'USD'  // CASH.KWD → KWD

// WRONG: Don't use holding.currency for cash
// const cashCurrency = holding.currency  // May be incorrect
```

This is because cash holdings may have been created with incorrect `holding.currency` values, but the symbol is always accurate.

---

## Common Issues & Debugging

### Issue 1: Cash Holdings Show Wrong Value

**Symptom:** CASH.KWD showing value as if it were USD

**Root Cause:** Code using `holding.currency` instead of extracting from symbol

**Solution:**
```typescript
const cashCurrency = holding.symbol.startsWith('CASH.')
  ? holding.symbol.split('.')[1] || 'USD'
  : holding.currency
```

### Issue 2: Account Cards Don't Respect Display Currency

**Symptom:** Changing currency dropdown doesn't affect account cards

**Root Cause:** Account cards using `account.currency` for display instead of converting to `baseCurrency`

**Solution:** Apply conversion rate from account currency to display currency

### Issue 3: Non-Priceable Assets Show $0

**Symptom:** REAL_ESTATE, OTHER, COMMODITY holdings show $0 value

**Root Cause:** No API price and `avgCostPerUnit` is NULL

**Solution:** Set `avgCostPerUnit = costBasis` when creating non-priceable holdings

### Issue 4: Round-Trip Conversion Error

**Symptom:** 1,000 KWD → USD → KWD = 1,000.07 KWD

**Root Cause:** Both USD→KWD and KWD→USD rates stored (floating-point drift)

**Solution:** Only store USD→X rates; calculate inverse as `1 / rate`

### Debugging Checklist

1. **Check exchange rates loaded:**
   ```typescript
   console.log('Exchange rates:', exchangeRates)
   // Should see: { USD: 1, GBP: 1.357, KWD: 3.275, ... }
   ```

2. **Check holding currency:**
   ```typescript
   console.log('Holding:', holding.symbol, 'currency:', holding.currency)
   ```

3. **Check conversion calculation:**
   ```typescript
   console.log('From:', fromCurrency, 'To:', toCurrency)
   console.log('Rate:', exchangeRates[fromCurrency] / exchangeRates[toCurrency])
   console.log('Value:', original, '→', converted)
   ```

4. **Database check for cash holdings:**
   ```sql
   SELECT symbol, currency FROM holdings WHERE symbol LIKE 'CASH.%';
   -- Verify currency matches symbol (CASH.KWD should have currency='KWD')
   ```

---

## Code Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/currency/currency-service.ts` | Exchange rate storage and conversion |
| `src/lib/portfolio/portfolio-service.ts` | Server-side portfolio summary with USD normalization |
| `src/lib/portfolio/tax-lot-service.ts` | Realized gains calculation |
| `src/app/(dashboard)/dashboard/portfolio/[id]/page.tsx` | Client-side display logic |
| `src/app/api/currency/route.ts` | Currency API endpoints |
| `src/lib/import/service.ts` | CSV import with currency handling |
| `src/lib/import/parsers/schwab.ts` | Schwab CSV parser |
| `src/lib/import/parsers/ibkr.ts` | IBKR CSV parser |

### API Endpoints

```bash
# Get available currencies
GET /api/currency?action=list

# Get exchange rates (USD → X)
GET /api/currency?action=rates&base=USD

# Convert amount
GET /api/currency?action=convert&from=USD&to=KWD&amount=1000

# Refresh rates from Frankfurter API
POST /api/currency
{ "base": "USD" }
```

### Adding a New Currency

1. **Add to database:**
   ```sql
   INSERT INTO currencies (id, code, name, symbol)
   VALUES (cuid(), 'JPY', 'Japanese Yen', '¥');
   ```

2. **Fetch exchange rate:**
   ```typescript
   // In currency-service.ts, add to target list
   const targetCurrencies = ["USD", "KWD", "GBP", "EUR", "CHF", "JPY"]
   ```

3. **Currency dropdowns update automatically** (they fetch from database)

---

## Changelog

### 2026-01-05
- Consolidated currency documentation into single reference
- Documented design decisions from architecture review
- Added comprehensive UI best practices section

### 2026-01-02
- Account cards now respect display currency selection
- Fixed cash currency extraction from symbol

### 2026-01-01
- Fixed multi-currency conversion for non-priceable assets
- Established currency hierarchy pattern

### 2025-12-31
- Added multi-currency support for CSV imports
- Fixed exchange rate round-trip accuracy (only store USD→X)
- Added currency dropdown to import dialog
