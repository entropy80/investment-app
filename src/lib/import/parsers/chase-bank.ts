import Papa from "papaparse";
import crypto from "crypto";
import {
  ChaseRawRow,
  NormalizedTransaction,
  CHASE_TYPE_MAP,
  MERCHANT_CATEGORY_PATTERNS,
} from "../types";
import { PortfolioTransactionType, TransactionCategory } from "@prisma/client";

/**
 * Parse amount string to number
 * Chase uses negative for debits, positive for credits
 */
function parseAmount(value: string): number {
  if (!value || value.trim() === "") return 0;
  const num = parseFloat(value.trim().replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * Parse Chase date format: "MM/DD/YYYY"
 */
function parseDate(value: string): Date {
  if (!value) return new Date();

  const parts = value.trim().split("/");
  if (parts.length !== 3) {
    console.warn(`Invalid Chase date format: ${value}`);
    return new Date();
  }

  const [month, day, year] = parts.map((p) => parseInt(p, 10));
  return new Date(year, month - 1, day);
}

/**
 * Map Chase transaction type to app transaction type
 */
function mapTypeToTransactionType(
  chaseType: string,
  details: string,
  amount: number
): PortfolioTransactionType {
  // Try direct mapping first
  if (CHASE_TYPE_MAP[chaseType]) {
    return CHASE_TYPE_MAP[chaseType];
  }

  // Fallback based on Details field (DEBIT/CREDIT)
  if (details === "CREDIT") {
    return "DEPOSIT";
  }
  if (details === "DEBIT") {
    return "WITHDRAWAL";
  }

  // Last resort: check amount sign
  return amount >= 0 ? "DEPOSIT" : "WITHDRAWAL";
}

/**
 * Auto-detect category from description using pattern matching
 */
function detectCategory(description: string): {
  category: TransactionCategory | undefined;
  merchant: string | undefined;
  isRecurring: boolean | undefined;
} {
  for (const rule of MERCHANT_CATEGORY_PATTERNS) {
    const matches =
      typeof rule.pattern === "string"
        ? description.toUpperCase().includes(rule.pattern.toUpperCase())
        : rule.pattern.test(description);

    if (matches) {
      return {
        category: rule.category,
        merchant: rule.merchant,
        isRecurring: rule.isRecurring,
      };
    }
  }

  return {
    category: undefined,
    merchant: undefined,
    isRecurring: undefined,
  };
}

/**
 * Extract a cleaner merchant name from the description
 */
function extractMerchant(description: string): string {
  // Remove common suffixes like location, date, ID
  let cleaned = description
    .replace(/\d{2}\/\d{2}$/, "") // Remove trailing dates like "04/27"
    .replace(/\s+[A-Z]{2}\s*$/, "") // Remove state codes at end
    .replace(/\s+\d{3}-\d{3}-\d{4}\s*/, " ") // Remove phone numbers
    .replace(/WEB ID:.*$/i, "") // Remove web IDs
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Take first part before common delimiters
  const parts = cleaned.split(/\s{2,}|\t/);
  return parts[0].trim();
}

/**
 * Generate external ID for duplicate detection
 */
function generateExternalId(row: ChaseRawRow): string {
  const data = `${row["Posting Date"]}|${row.Description}|${row.Amount}|${row.Type}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Parse Chase Bank CSV content and return normalized transactions
 * @param csvContent - The CSV content to parse
 * @param currency - Currency code for transactions (defaults to USD)
 *
 * Note: Chase CSVs contain partial history with a Balance column showing
 * the running balance. This parser calculates and creates an opening
 * balance adjustment transaction to ensure correct cash balance.
 */
export function parseChaseCSV(
  csvContent: string,
  currency: string = "USD"
): NormalizedTransaction[] {
  const result = Papa.parse<ChaseRawRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("CSV parsing warnings:", result.errors);
  }

  const transactions: NormalizedTransaction[] = [];
  let finalBalance: number | null = null;
  let earliestDate: Date | null = null;
  let transactionSum = 0;

  for (const row of result.data) {
    // Skip empty rows
    if (!row["Posting Date"] || !row.Description) continue;

    // Skip if date doesn't look like a date
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(row["Posting Date"])) continue;

    const amount = parseAmount(row.Amount);
    const balance = parseAmount(row.Balance);
    const txDate = parseDate(row["Posting Date"]);

    // Capture the final balance from the first valid row (Chase CSV is reverse chronological)
    if (finalBalance === null && balance !== 0) {
      finalBalance = balance;
    }

    // Track the earliest date for the opening balance transaction
    if (earliestDate === null || txDate < earliestDate) {
      earliestDate = txDate;
    }

    // Skip zero-amount transactions
    if (amount === 0) continue;

    // Sum up all transaction amounts
    transactionSum += amount;

    // Detect category from description
    const categoryInfo = detectCategory(row.Description);

    // Extract merchant name
    const detectedMerchant = categoryInfo.merchant || extractMerchant(row.Description);

    const transaction: NormalizedTransaction = {
      date: txDate,
      type: mapTypeToTransactionType(row.Type, row.Details, amount),
      symbol: null, // Bank transactions don't have symbols
      description: row.Description.trim(),
      quantity: null,
      price: null,
      amount: amount,
      fees: null,
      currency: currency,
      externalId: generateExternalId(row),
      importSource: "chase_bank",
      rawData: row as unknown as Record<string, string>,
      // Bank-specific fields
      category: categoryInfo.category,
      merchant: detectedMerchant,
      isRecurring: categoryInfo.isRecurring,
    };

    transactions.push(transaction);
  }

  // Calculate and add opening balance transaction if we have balance data
  if (finalBalance !== null && earliestDate !== null) {
    const openingBalance = finalBalance - transactionSum;

    // Only add opening balance if it's non-zero (account had prior balance)
    if (Math.abs(openingBalance) > 0.01) {
      // Create opening balance transaction dated one day before earliest transaction
      const openingDate = new Date(earliestDate);
      openingDate.setDate(openingDate.getDate() - 1);

      const openingBalanceTx: NormalizedTransaction = {
        date: openingDate,
        type: "ADJUSTMENT",
        symbol: null,
        description: "Opening Balance (imported from Chase statement)",
        quantity: null,
        price: null,
        amount: openingBalance,
        fees: null,
        currency: currency,
        externalId: crypto.createHash("sha256")
          .update(`chase_opening_balance_${openingDate.toISOString()}_${openingBalance}`)
          .digest("hex")
          .substring(0, 32),
        importSource: "chase_bank",
        rawData: { type: "OPENING_BALANCE", amount: openingBalance.toString() },
        category: "TRANSFER",
        merchant: "Opening Balance",
        isRecurring: false,
      };

      // Add opening balance as the first transaction
      transactions.unshift(openingBalanceTx);

      console.log(`Chase import: Added opening balance of $${openingBalance.toFixed(2)} (Final: $${finalBalance.toFixed(2)}, Transactions: $${transactionSum.toFixed(2)})`);
    }
  }

  return transactions;
}

/**
 * Detect if content is Chase Bank format
 */
export function isChaseFormat(csvContent: string): boolean {
  const firstLine = csvContent.split("\n")[0];
  // Chase checking/savings format
  return (
    firstLine.includes("Details") &&
    firstLine.includes("Posting Date") &&
    firstLine.includes("Description") &&
    firstLine.includes("Amount") &&
    firstLine.includes("Type") &&
    firstLine.includes("Balance")
  );
}
