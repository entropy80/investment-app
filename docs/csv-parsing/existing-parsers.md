# CSV Import Parsers

**Last Updated:** 2026-01-09

The application supports the following CSV parsers:

## Brokerages

1. **Charles Schwab** (`src/lib/import/parsers/schwab.ts`)
2. **Interactive Brokers (IBKR)** (`src/lib/import/parsers/ibkr.ts`)

## Banks

3. **Chase Bank** (`src/lib/import/parsers/chase-bank.ts`) - Added 2026-01-08
4. **Bank of America** (`src/lib/import/parsers/bofa.ts`) - Added 2026-01-08
5. **NBK (Kuwait)** (`src/lib/import/parsers/nbk.ts`) - Added 2026-01-08

---

## Requirements to Test CSV Import with KWD

### Option 1: Use Existing Parsers with Currency Override

If your Kuwaiti brokerage exports CSV in a format similar to Schwab or IBKR:

1. Select the matching broker format (or use auto-detect)
2. Select **KWD** from the currency dropdown
3. Upload the CSV

The parser will tag all transactions with KWD instead of USD.

### Option 2: Create a New Parser

If your Kuwaiti brokerage has a unique CSV format, you would need to:

1. Create a new parser in `src/lib/import/parsers/` (e.g., `kuwait-broker.ts`)
2. Add the format to `BrokerFormat` type in `src/lib/import/types.ts`
3. Update `detectBrokerFormat()` and `parseCSV()` in `src/lib/import/service.ts`
4. Add the option to the import dialog dropdown

---

## Current CSV Format Requirements

| Broker | Expected Columns | Date Format |
|--------|------------------|-------------|
| Schwab | Date, Action, Symbol, Description, Quantity, Price, Fees & Comm, Amount | MM/DD/YYYY |
| IBKR | Transaction History section with Date, Account, Description, Transaction Type, Symbol, Quantity, Price, Gross Amount, Commission, Net Amount | YYYY-MM-DD |

---

## What Happens When Importing with Non-USD Currency

When you select a non-USD currency (e.g., KWD) as the import currency:

- All parsed transactions are tagged with `currency: "KWD"`
- New holdings created from the import will have `currency: "KWD"`
- The amounts are stored as-is (no conversion during import)
- Portfolio totals will convert these amounts to USD using exchange rates

---

## Adding a New Parser

To add support for a new broker format:

### 1. Create the Parser File

Create `src/lib/import/parsers/your-broker.ts`:

```typescript
import Papa from "papaparse";
import crypto from "crypto";
import { NormalizedTransaction } from "../types";

export function parseYourBrokerCSV(
  csvContent: string,
  currency: string = "USD"
): NormalizedTransaction[] {
  // Parse CSV
  // Map to NormalizedTransaction format
  // Return array of transactions
}

export function isYourBrokerFormat(csvContent: string): boolean {
  // Check if CSV matches your broker's format
  // Return true/false
}
```

### 2. Update Types

Add to `src/lib/import/types.ts`:

```typescript
export type BrokerFormat = "schwab" | "ibkr" | "your-broker";
```

### 3. Update Service

Add to `src/lib/import/service.ts`:

```typescript
import { parseYourBrokerCSV, isYourBrokerFormat } from "./parsers/your-broker";

export function detectBrokerFormat(csvContent: string): BrokerFormat | null {
  if (isSchwabFormat(csvContent)) return "schwab";
  if (isIBKRFormat(csvContent)) return "ibkr";
  if (isYourBrokerFormat(csvContent)) return "your-broker";
  return null;
}

export function parseCSV(
  csvContent: string,
  format: BrokerFormat,
  currency: string = "USD"
): NormalizedTransaction[] {
  switch (format) {
    case "schwab":
      return parseSchwabCSV(csvContent, currency);
    case "ibkr":
      return parseIBKRCSV(csvContent, currency);
    case "your-broker":
      return parseYourBrokerCSV(csvContent, currency);
    default:
      throw new Error(`Unsupported broker format: ${format}`);
  }
}
```

### 4. Update UI

Add to the import dialog in `src/app/(dashboard)/dashboard/portfolio/[id]/page.tsx`:

```tsx
<SelectItem value="your-broker">Your Broker Name</SelectItem>
```
