import Papa from "papaparse";
import crypto from "crypto";
import { NormalizedTransaction } from "../types";
import { PortfolioTransactionType, TransactionCategory } from "@prisma/client";

/**
 * Raw parsed row from NBK CSV (National Bank of Kuwait)
 */
export interface NBKRawRow {
  "Posting Date": string;    // DD-MM-YYYY
  Description: string;       // Transaction type (e.g., "Debit-NBK Transfer")
  Details: string;           // Pipe-delimited details
  "Transaction Date": string; // DD-MM-YYYY
  Amount: string;            // Decimal with 3dp (KWD), negative for debits
  Balance: string;           // Running balance with 3dp
}

/**
 * Parse amount string to number
 * NBK uses negative for debits, positive for credits
 * KWD has 3 decimal places
 */
function parseAmount(value: string): number {
  if (!value || value.trim() === "") return 0;
  const num = parseFloat(value.trim().replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * Parse NBK date format: "DD-MM-YYYY"
 */
function parseDate(value: string): Date {
  if (!value) return new Date();

  const parts = value.trim().split("-");
  if (parts.length !== 3) {
    console.warn(`Invalid NBK date format: ${value}`);
    return new Date();
  }

  const [day, month, year] = parts.map((p) => parseInt(p, 10));
  return new Date(year, month - 1, day);
}

/**
 * NBK description patterns to transaction type mapping
 */
const NBK_TYPE_PATTERNS: Array<{
  pattern: RegExp;
  type: PortfolioTransactionType;
}> = [
  // Interest
  { pattern: /^Credit Int$/i, type: "INTEREST" },

  // Fees
  { pattern: /Bank Transfer Fee/i, type: "FEE" },

  // Internal NBK Transfers (note: some have double spaces)
  { pattern: /^Debit-NBK\s+Transfer$/i, type: "TRANSFER_OUT" },
  { pattern: /^Credit-NBK\s+Transfer$/i, type: "TRANSFER_IN" },

  // External Bank Transfers (SWIFT)
  { pattern: /^Debit-Bank Transfer$/i, type: "TRANSFER_OUT" },
  { pattern: /^Credit-Bank Transfer$/i, type: "TRANSFER_IN" },

  // Mobile Banking SWIFT transfers
  { pattern: /^Debit-\s*MOB$/i, type: "TRANSFER_OUT" },
  { pattern: /^Credit-\s*MOB$/i, type: "TRANSFER_IN" },

  // WAMD (local payment system)
  { pattern: /^Debit-\s*WAMD Transfer$/i, type: "TRANSFER_OUT" },
  { pattern: /^Credit-\s*WAMD Transfer$/i, type: "TRANSFER_IN" },

  // Generic transfers
  { pattern: /^Debit-Transfer$/i, type: "TRANSFER_OUT" },
  { pattern: /^Credit-Transfer$/i, type: "TRANSFER_IN" },

  // Salary/payroll
  { pattern: /Salary|Payroll/i, type: "DEPOSIT" },
];

/**
 * Map NBK description to app transaction type
 */
function mapDescriptionToType(
  description: string,
  amount: number
): PortfolioTransactionType {
  // Try pattern matching first
  for (const { pattern, type } of NBK_TYPE_PATTERNS) {
    if (pattern.test(description)) {
      return type;
    }
  }

  // Fallback based on amount sign
  return amount >= 0 ? "DEPOSIT" : "WITHDRAWAL";
}

/**
 * Extract purpose/category from Details field
 * Details are pipe-delimited, e.g., "Fund Transfer|TRANSFER TO 1234567890|NAME"
 */
function extractDetailsInfo(details: string): {
  purpose: string;
  counterparty: string | undefined;
  category: TransactionCategory | undefined;
} {
  if (!details) {
    return { purpose: "", counterparty: undefined, category: undefined };
  }

  const parts = details.split("|").map(p => p.trim());
  const purpose = parts[0] || "";

  // Try to extract counterparty name (usually after account number)
  let counterparty: string | undefined;
  for (const part of parts) {
    // Skip account numbers and transfer directions
    if (part.match(/^(TRANSFER (TO|FROM)|COUNTERPARTY|PURPOSE|SWIFT|IPS)/i)) continue;
    if (part.match(/^\d+$/)) continue; // Pure numbers are account IDs
    if (part.match(/^[A-Z]{2}$/)) continue; // Country codes

    // This might be a name
    if (part.match(/^[A-Z\s]+$/i) && part.length > 3) {
      counterparty = part;
      break;
    }
  }

  // Auto-detect category based on purpose
  let category: TransactionCategory | undefined;
  const purposeLower = purpose.toLowerCase();

  if (purposeLower.includes("salary") || purposeLower.includes("payroll")) {
    category = "SALARY";
  } else if (purposeLower.includes("transfer") || purposeLower.includes("own transfer")) {
    category = "TRANSFER";
  } else if (purposeLower.includes("family")) {
    category = "TRANSFER";
  } else if (purposeLower.includes("interest")) {
    category = "INVESTMENT_INCOME";
  } else if (purposeLower.includes("bill") || purposeLower.includes("payment")) {
    category = "BANK_FEES"; // Generic for bill payments
  }

  return { purpose, counterparty, category };
}

/**
 * Generate external ID for duplicate detection
 */
function generateExternalId(row: NBKRawRow): string {
  const data = `${row["Posting Date"]}|${row.Description}|${row.Amount}|${row.Balance}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Parse NBK Bank CSV content and return normalized transactions
 * @param csvContent - The CSV content to parse
 * @param currency - Currency code for transactions (defaults to KWD)
 *
 * Note: NBK CSVs contain partial history with a Balance column showing
 * the running balance. This parser calculates and creates an opening
 * balance adjustment transaction to ensure correct cash balance.
 */
export function parseNBKCSV(
  csvContent: string,
  currency: string = "KWD"
): NormalizedTransaction[] {
  const result = Papa.parse<NBKRawRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("NBK CSV parsing warnings:", result.errors);
  }

  const transactions: NormalizedTransaction[] = [];
  let finalBalance: number | null = null;
  let earliestDate: Date | null = null;
  let transactionSum = 0;

  for (const row of result.data) {
    // Skip empty rows
    if (!row["Posting Date"] || !row.Description) continue;

    // Skip if date doesn't look like a date (DD-MM-YYYY)
    if (!/^\d{1,2}-\d{1,2}-\d{4}/.test(row["Posting Date"])) continue;

    const amount = parseAmount(row.Amount);
    const balance = parseAmount(row.Balance);
    const txDate = parseDate(row["Posting Date"]);

    // Capture the final balance from the first valid row (NBK CSV is reverse chronological)
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

    // Extract info from Details field
    const detailsInfo = extractDetailsInfo(row.Details);

    // Build description from Description + purpose
    const description = detailsInfo.purpose
      ? `${row.Description.trim()} - ${detailsInfo.purpose}`
      : row.Description.trim();

    const transaction: NormalizedTransaction = {
      date: txDate,
      type: mapDescriptionToType(row.Description, amount),
      symbol: null, // Bank transactions don't have symbols
      description: description,
      quantity: null,
      price: null,
      amount: amount,
      fees: null,
      currency: currency,
      externalId: generateExternalId(row),
      importSource: "nbk",
      rawData: row as unknown as Record<string, string>,
      // Bank-specific fields
      category: detailsInfo.category,
      merchant: detailsInfo.counterparty,
      isRecurring: false,
    };

    transactions.push(transaction);
  }

  // Calculate and add opening balance transaction if we have balance data
  if (finalBalance !== null && earliestDate !== null) {
    const openingBalance = finalBalance - transactionSum;

    // Only add opening balance if it's non-zero (account had prior balance)
    if (Math.abs(openingBalance) > 0.001) { // KWD uses 3 decimal places
      // Create opening balance transaction dated one day before earliest transaction
      const openingDate = new Date(earliestDate);
      openingDate.setDate(openingDate.getDate() - 1);

      const openingBalanceTx: NormalizedTransaction = {
        date: openingDate,
        type: "ADJUSTMENT",
        symbol: null,
        description: "Opening Balance (imported from NBK statement)",
        quantity: null,
        price: null,
        amount: openingBalance,
        fees: null,
        currency: currency,
        externalId: crypto.createHash("sha256")
          .update(`nbk_opening_balance_${openingDate.toISOString()}_${openingBalance}`)
          .digest("hex")
          .substring(0, 32),
        importSource: "nbk",
        rawData: { type: "OPENING_BALANCE", amount: openingBalance.toString() },
        category: "TRANSFER",
        merchant: "Opening Balance",
        isRecurring: false,
      };

      // Add opening balance as the first transaction
      transactions.unshift(openingBalanceTx);

      console.log(`NBK import: Added opening balance of ${currency} ${openingBalance.toFixed(3)} (Final: ${currency} ${finalBalance.toFixed(3)}, Transactions: ${currency} ${transactionSum.toFixed(3)})`);
    }
  }

  return transactions;
}

/**
 * Detect if content is NBK Bank format
 */
export function isNBKFormat(csvContent: string): boolean {
  const firstLine = csvContent.split("\n")[0];
  // NBK savings/checking format
  return (
    firstLine.includes("Posting Date") &&
    firstLine.includes("Description") &&
    firstLine.includes("Details") &&
    firstLine.includes("Transaction Date") &&
    firstLine.includes("Amount") &&
    firstLine.includes("Balance")
  );
}
