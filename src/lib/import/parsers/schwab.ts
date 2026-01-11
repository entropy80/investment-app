import Papa from "papaparse";
import crypto from "crypto";
import {
  SchwabRawRow,
  NormalizedTransaction,
  SCHWAB_ACTION_MAP,
} from "../types";
import { PortfolioTransactionType } from "@prisma/client";

/**
 * Parse currency amount string like "$1,234.56" or "-$1,234.56" to number
 */
function parseAmount(value: string): number | null {
  if (!value || value.trim() === "") return null;

  // Remove $ and commas, handle negative
  const cleaned = value.trim().replace(/[$,]/g, "");
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Parse quantity string to number
 */
function parseQuantity(value: string): number | null {
  if (!value || value.trim() === "") return null;

  const num = parseFloat(value.trim());
  return isNaN(num) ? null : num;
}

/**
 * Parse Schwab date format: "MM/DD/YYYY" or "MM/DD/YYYY as of MM/DD/YYYY"
 */
function parseDate(value: string): Date {
  if (!value) return new Date();

  // Handle "as of" dates - use the first date
  const dateStr = value.split(" as of ")[0].trim();

  // Parse MM/DD/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    console.warn(`Invalid date format: ${value}`);
    return new Date();
  }

  const [month, day, year] = parts.map((p) => parseInt(p, 10));
  return new Date(year, month - 1, day);
}

/**
 * Map Schwab action to transaction type
 */
function mapActionToType(
  action: string,
  amount: number | null
): PortfolioTransactionType {
  // Direct mapping
  if (SCHWAB_ACTION_MAP[action]) {
    const mappedType = SCHWAB_ACTION_MAP[action];

    // For Journal entries, check amount sign to determine direction
    if (action === "Journal" && amount !== null) {
      return amount < 0 ? "TRANSFER_OUT" : "TRANSFER_IN";
    }

    return mappedType;
  }

  // Try partial matching for variations
  const actionLower = action.toLowerCase();

  if (actionLower.includes("dividend")) {
    if (actionLower.includes("reinvest")) {
      return "REINVEST_DIVIDEND";
    }
    return "DIVIDEND";
  }

  if (actionLower.includes("buy")) return "BUY";
  if (actionLower.includes("sell")) return "SELL";
  if (actionLower.includes("interest")) return "INTEREST";
  if (actionLower.includes("tax")) return "TAX_WITHHOLDING";
  if (actionLower.includes("transfer") || actionLower.includes("wire")) {
    return amount !== null && amount < 0 ? "WITHDRAWAL" : "DEPOSIT";
  }
  if (actionLower.includes("fee")) return "FEE";

  console.warn(`Unknown Schwab action: ${action}`);
  return "OTHER";
}

/**
 * Generate external ID for duplicate detection
 */
function generateExternalId(row: SchwabRawRow): string {
  // Create a hash from date + action + symbol + amount + quantity
  const data = `${row.Date}|${row.Action}|${row.Symbol}|${row.Amount}|${row.Quantity}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Parse Schwab CSV content and return normalized transactions
 * @param csvContent - The CSV content to parse
 * @param currency - Currency code for transactions (defaults to USD)
 */
export function parseSchwabCSV(csvContent: string, currency: string = "USD"): NormalizedTransaction[] {
  const result = Papa.parse<SchwabRawRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("CSV parsing warnings:", result.errors);
  }

  const transactions: NormalizedTransaction[] = [];

  for (const row of result.data) {
    // Skip empty rows or header rows
    if (!row.Date || !row.Action) continue;

    // Skip if Date doesn't look like a date (might be a summary row)
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(row.Date)) continue;

    const amount = parseAmount(row.Amount);
    const quantity = parseQuantity(row.Quantity);
    const price = parseAmount(row.Price);
    const fees = parseAmount(row["Fees & Comm"]);

    // Skip rows with no meaningful data
    if (amount === null && quantity === null) continue;

    const transaction: NormalizedTransaction = {
      date: parseDate(row.Date),
      type: mapActionToType(row.Action, amount),
      symbol: row.Symbol?.trim() || null,
      description: row.Description?.trim() || row.Action,
      quantity: quantity,
      price: price,
      amount: amount ?? 0,
      fees: fees,
      currency: currency,
      externalId: generateExternalId(row),
      importSource: "schwab",
      rawData: row as unknown as Record<string, string>,
    };

    transactions.push(transaction);
  }

  return transactions;
}

/**
 * Detect if content is Schwab format
 */
export function isSchwabFormat(csvContent: string): boolean {
  const firstLine = csvContent.split("\n")[0];
  return (
    firstLine.includes('"Date"') &&
    firstLine.includes('"Action"') &&
    firstLine.includes('"Symbol"') &&
    firstLine.includes('"Amount"')
  );
}
