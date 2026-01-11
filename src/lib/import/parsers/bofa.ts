import Papa from "papaparse";
import crypto from "crypto";
import { NormalizedTransaction, MERCHANT_CATEGORY_PATTERNS } from "../types";
import { PortfolioTransactionType, TransactionCategory } from "@prisma/client";

/**
 * Raw parsed row from Bank of America CSV
 */
export interface BOFARawRow {
  Date: string;           // MM/DD/YYYY
  Description: string;    // Transaction description
  Amount: string;         // Quoted with commas, negative for debits
  "Running Bal.": string; // Running balance
}

/**
 * Parse amount string to number
 * BOA uses negative for debits, positive for credits
 * Format: quoted with commas (e.g., "-3,650.00", "75,000.00")
 */
function parseAmount(value: string): number {
  if (!value || value.trim() === "") return 0;
  // Remove quotes and commas
  const cleaned = value.trim().replace(/"/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse BOA date format: "MM/DD/YYYY"
 */
function parseDate(value: string): Date {
  if (!value) return new Date();

  const parts = value.trim().split("/");
  if (parts.length !== 3) {
    console.warn(`Invalid BOA date format: ${value}`);
    return new Date();
  }

  const [month, day, year] = parts.map((p) => parseInt(p, 10));
  return new Date(year, month - 1, day);
}

/**
 * BOA description patterns to transaction type mapping
 */
const BOFA_TYPE_PATTERNS: Array<{
  pattern: RegExp;
  type: PortfolioTransactionType;
}> = [
  // Wire transfers
  { pattern: /WIRE TYPE:WIRE OUT/i, type: "TRANSFER_OUT" },
  { pattern: /WIRE TYPE:INTL IN/i, type: "TRANSFER_IN" },
  { pattern: /WIRE TYPE:WIRE IN/i, type: "TRANSFER_IN" },

  // Wire fees
  { pattern: /Wire Transfer Fee/i, type: "FEE" },

  // Internal transfers (Zelle, etc.)
  { pattern: /^TRANSFER\s+.*Confirmation#/i, type: "TRANSFER_OUT" },

  // Brokerage transfers
  { pattern: /SCHWAB BROKERAGE.*MONEYLINK/i, type: "TRANSFER_OUT" },
  { pattern: /INTERACTIVE BROK.*ACH TRANSF/i, type: "TRANSFER_OUT" },

  // Fee waivers ($0 entries)
  { pattern: /Fee Waiver/i, type: "ADJUSTMENT" },

  // Settlements
  { pattern: /Settlement/i, type: "DEPOSIT" },

  // Deposits
  { pattern: /Direct Deposit|PAYROLL/i, type: "DEPOSIT" },
];

/**
 * Map BOA description to app transaction type
 */
function mapDescriptionToType(
  description: string,
  amount: number
): PortfolioTransactionType {
  // Try pattern matching first
  for (const { pattern, type } of BOFA_TYPE_PATTERNS) {
    if (pattern.test(description)) {
      return type;
    }
  }

  // Fallback based on amount sign
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
  // Use shared merchant patterns from types.ts
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

  // BOA-specific category detection
  const descUpper = description.toUpperCase();

  // Wire transfers
  if (descUpper.includes("WIRE TYPE:") || descUpper.includes("TRANSFER")) {
    return { category: "TRANSFER", merchant: undefined, isRecurring: false };
  }

  // Brokerage
  if (descUpper.includes("SCHWAB") || descUpper.includes("INTERACTIVE BROK")) {
    return { category: "INVESTMENT", merchant: undefined, isRecurring: false };
  }

  // Fees
  if (descUpper.includes("FEE") && !descUpper.includes("WAIVER")) {
    return { category: "BANK_FEES", merchant: undefined, isRecurring: false };
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
  // Remove common patterns
  let cleaned = description
    .replace(/\d{2}\/\d{2}\s+PURCHASE\s*/i, "") // Remove "MM/DD PURCHASE"
    .replace(/PURCHASE\s*/i, "")
    .replace(/\s+[A-Z]{2}\s*$/, "") // Remove state codes at end
    .replace(/\s+\d{3}-\d{3}-\d{4}\s*/, " ") // Remove phone numbers
    .replace(/XXX[-X]+\d*/g, "") // Remove masked numbers
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // For wire transfers, extract counterparty
  if (cleaned.includes("BNF:")) {
    const bnfMatch = cleaned.match(/BNF:([^|]+)/);
    if (bnfMatch) {
      return bnfMatch[1].trim();
    }
  }

  // For internal transfers, extract recipient name
  if (cleaned.includes("TRANSFER") && cleaned.includes(":")) {
    const parts = cleaned.split(":");
    if (parts.length >= 2) {
      const name = parts[1].split("Confirmation")[0].trim();
      if (name.length > 2) return name;
    }
  }

  // Take first meaningful part
  const parts = cleaned.split(/\s{2,}|\t|\|/);
  return parts[0].trim().substring(0, 50); // Limit length
}

/**
 * Generate external ID for duplicate detection
 */
function generateExternalId(row: BOFARawRow): string {
  const data = `${row.Date}|${row.Description}|${row.Amount}|${row["Running Bal."]}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Parse Bank of America CSV content and return normalized transactions
 * @param csvContent - The CSV content to parse
 * @param currency - Currency code for transactions (defaults to USD)
 *
 * BOA CSV format:
 * - First 5 lines contain summary (skip these)
 * - Transaction header: Date,Description,Amount,Running Bal.
 * - First transaction row is "Beginning balance" (use as opening balance)
 */
export function parseBOFACSV(
  csvContent: string,
  currency: string = "USD"
): NormalizedTransaction[] {
  // BOA CSV has summary section at top - find the transaction header
  const lines = csvContent.split("\n");
  let transactionStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Date,Description,Amount,Running Bal.")) {
      transactionStartIndex = i;
      break;
    }
  }

  if (transactionStartIndex === -1) {
    console.warn("BOA CSV: Could not find transaction header");
    return [];
  }

  // Extract only transaction portion
  const transactionCSV = lines.slice(transactionStartIndex).join("\n");

  const result = Papa.parse<BOFARawRow>(transactionCSV, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("BOA CSV parsing warnings:", result.errors);
  }

  const transactions: NormalizedTransaction[] = [];
  let openingBalanceAmount: number | null = null;
  let openingBalanceDate: Date | null = null;

  for (const row of result.data) {
    // Skip empty rows
    if (!row.Date || !row.Description) continue;

    // Skip if date doesn't look like a date
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(row.Date)) continue;

    const amount = parseAmount(row.Amount);
    const balance = parseAmount(row["Running Bal."]);
    const txDate = parseDate(row.Date);

    // Check for "Beginning balance" row - this gives us the opening balance directly
    if (row.Description.toLowerCase().includes("beginning balance")) {
      openingBalanceAmount = balance;
      openingBalanceDate = txDate;
      continue; // Don't add as a regular transaction
    }

    // Skip zero-amount transactions (like fee waivers)
    if (amount === 0) continue;

    // Detect category from description
    const categoryInfo = detectCategory(row.Description);

    // Extract merchant name
    const detectedMerchant = categoryInfo.merchant || extractMerchant(row.Description);

    const transaction: NormalizedTransaction = {
      date: txDate,
      type: mapDescriptionToType(row.Description, amount),
      symbol: null, // Bank transactions don't have symbols
      description: row.Description.trim(),
      quantity: null,
      price: null,
      amount: amount,
      fees: null,
      currency: currency,
      externalId: generateExternalId(row),
      importSource: "bofa",
      rawData: row as unknown as Record<string, string>,
      // Bank-specific fields
      category: categoryInfo.category,
      merchant: detectedMerchant,
      isRecurring: categoryInfo.isRecurring,
    };

    transactions.push(transaction);
  }

  // Add opening balance transaction if we found it
  if (openingBalanceAmount !== null && openingBalanceDate !== null && openingBalanceAmount !== 0) {
    // Create opening balance transaction dated one day before
    const openingDate = new Date(openingBalanceDate);
    openingDate.setDate(openingDate.getDate() - 1);

    const openingBalanceTx: NormalizedTransaction = {
      date: openingDate,
      type: "ADJUSTMENT",
      symbol: null,
      description: "Opening Balance (imported from Bank of America statement)",
      quantity: null,
      price: null,
      amount: openingBalanceAmount,
      fees: null,
      currency: currency,
      externalId: crypto.createHash("sha256")
        .update(`bofa_opening_balance_${openingDate.toISOString()}_${openingBalanceAmount}`)
        .digest("hex")
        .substring(0, 32),
      importSource: "bofa",
      rawData: { type: "OPENING_BALANCE", amount: openingBalanceAmount.toString() },
      category: "TRANSFER",
      merchant: "Opening Balance",
      isRecurring: false,
    };

    // Add opening balance as the first transaction
    transactions.unshift(openingBalanceTx);

    console.log(`BOA import: Added opening balance of $${openingBalanceAmount.toLocaleString()} from ${openingBalanceDate.toISOString().split("T")[0]}`);
  }

  return transactions;
}

/**
 * Detect if content is Bank of America format
 */
export function isBOFAFormat(csvContent: string): boolean {
  const lines = csvContent.split("\n");

  // BOA has summary section with "Beginning balance" and "Ending balance"
  // Then transaction header: Date,Description,Amount,Running Bal.
  let hasSummary = false;
  let hasTransactionHeader = false;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.includes("Beginning balance") || line.includes("Ending balance")) {
      hasSummary = true;
    }
    if (line.includes("Date,Description,Amount,Running Bal.")) {
      hasTransactionHeader = true;
    }
  }

  return hasSummary && hasTransactionHeader;
}
