import Papa from "papaparse";
import crypto from "crypto";
import { NormalizedTransaction, IBKR_TYPE_MAP } from "../types";
import { PortfolioTransactionType } from "@prisma/client";

/**
 * Raw IBKR row after initial parsing
 */
interface IBKRParsedRow {
  section: string;
  rowType: string;
  date: string;
  account: string;
  description: string;
  transactionType: string;
  symbol: string;
  quantity: string;
  price: string;
  grossAmount: string;
  commission: string;
  netAmount: string;
  transactionFees: string;
}

/**
 * Parse numeric value, handling scientific notation and commas
 */
function parseNumber(value: string): number | null {
  if (!value || value.trim() === "" || value.trim() === "-") return null;

  // Remove commas
  const cleaned = value.trim().replace(/,/g, "");
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Parse IBKR date format: "YYYY-MM-DD"
 */
function parseDate(value: string): Date {
  if (!value || value.trim() === "") return new Date();

  const dateStr = value.trim();

  // Handle YYYY-MM-DD format
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map((p) => parseInt(p, 10));
    return new Date(year, month - 1, day);
  }

  // Fallback to Date parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Map IBKR transaction type to app type
 */
function mapTransactionType(
  ibkrType: string,
  netAmount: number | null,
  description: string
): PortfolioTransactionType {
  // Direct mapping
  if (IBKR_TYPE_MAP[ibkrType]) {
    const mappedType = IBKR_TYPE_MAP[ibkrType];

    // For System Transfer, check description and amount sign
    if (ibkrType === "Deposit" || ibkrType === "System Transfer") {
      if (description.includes("Transfer to")) {
        return "TRANSFER_OUT";
      }
      if (description.includes("Transfer from")) {
        return "TRANSFER_IN";
      }
      return netAmount !== null && netAmount < 0 ? "WITHDRAWAL" : "DEPOSIT";
    }

    return mappedType;
  }

  // Handle variations
  const typeLower = ibkrType.toLowerCase();

  if (typeLower.includes("dividend")) return "DIVIDEND";
  if (typeLower.includes("interest")) return "INTEREST";
  if (typeLower.includes("tax")) return "TAX_WITHHOLDING";
  if (typeLower.includes("forex") || typeLower.includes("fx")) return "FOREX";
  if (typeLower.includes("adjustment")) return "ADJUSTMENT";
  if (typeLower.includes("buy")) return "BUY";
  if (typeLower.includes("sell")) return "SELL";
  if (typeLower.includes("deposit")) return "DEPOSIT";
  if (typeLower.includes("withdrawal")) return "WITHDRAWAL";
  if (typeLower.includes("fee")) return "FEE";

  console.warn(`Unknown IBKR transaction type: ${ibkrType}`);
  return "OTHER";
}

/**
 * Normalize symbol for crypto and forex
 * BTC.USD-ZEROHASH -> BTC
 * ETH.USD-ZEROHASH -> ETH
 * EUR.USD -> null (forex trades don't need holdings)
 */
function normalizeSymbol(symbol: string, transactionType: string): string | null {
  if (!symbol || symbol.trim() === "" || symbol.trim() === "-") return null;

  const sym = symbol.trim();

  // Crypto symbols from IBKR
  if (sym.includes("-ZEROHASH")) {
    // BTC.USD-ZEROHASH -> BTC
    return sym.split(".")[0];
  }

  // Forex pairs - don't create holdings, just track the transaction
  // These are currency conversion transactions, not asset holdings
  if (transactionType === "Forex Trade Component" ||
      sym.match(/^[A-Z]{3}\.[A-Z]{3}$/)) {
    return null; // Don't create a holding for forex
  }

  // Regular symbols
  return sym;
}

/**
 * Determine asset currency from symbol
 * @param symbol - The trading symbol
 * @param fallbackCurrency - Currency to use if not determinable from symbol (defaults to USD)
 */
function determineCurrency(symbol: string | null, fallbackCurrency: string = "USD"): string {
  if (!symbol) return fallbackCurrency;

  // Forex pairs - the amount is typically in the quote currency
  if (symbol.includes(".")) {
    const parts = symbol.split(".");
    // For EUR.USD, the amount is in USD (quote currency)
    if (parts.length === 2 && parts[1].length === 3) {
      return parts[1]; // Return quote currency
    }
  }

  return fallbackCurrency;
}

/**
 * Generate external ID for duplicate detection
 */
function generateExternalId(row: IBKRParsedRow): string {
  // Create a hash from date + type + symbol + amount + quantity
  const data = `${row.date}|${row.transactionType}|${row.symbol}|${row.netAmount}|${row.quantity}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Parse IBKR CSV content and return normalized transactions
 *
 * IBKR CSV has multiple sections:
 * - Statement (metadata)
 * - Summary (cash summary)
 * - Transaction History (the actual transactions we need)
 *
 * @param csvContent - The CSV content to parse
 * @param currency - Currency code for transactions (defaults to USD)
 */
export function parseIBKRCSV(csvContent: string, currency: string = "USD"): NormalizedTransaction[] {
  // Parse as raw CSV first
  const result = Papa.parse<string[]>(csvContent, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.warn("CSV parsing warnings:", result.errors);
  }

  const transactions: NormalizedTransaction[] = [];
  let inTransactionHistory = false;
  let headerRow: string[] | null = null;

  for (const row of result.data) {
    // Check if this is a Transaction History section
    if (row[0] === "Transaction History") {
      if (row[1] === "Header") {
        // This is the header row for Transaction History
        headerRow = row.slice(2); // Skip "Transaction History,Header"
        inTransactionHistory = true;
        continue;
      }

      if (row[1] === "Data" && inTransactionHistory && headerRow) {
        // This is a data row in Transaction History
        const data = row.slice(2); // Skip "Transaction History,Data"

        const parsedRow: IBKRParsedRow = {
          section: "Transaction History",
          rowType: "Data",
          date: data[0] || "",
          account: data[1] || "",
          description: data[2] || "",
          transactionType: data[3] || "",
          symbol: data[4] || "",
          quantity: data[5] || "",
          price: data[6] || "",
          grossAmount: data[7] || "",
          commission: data[8] || "",
          netAmount: data[9] || "",
          transactionFees: data[10] || "",
        };

        // Skip rows without meaningful data
        if (!parsedRow.date || !parsedRow.transactionType) continue;

        // Skip if date doesn't look valid
        if (!/^\d{4}-\d{2}-\d{2}/.test(parsedRow.date)) continue;

        const netAmount = parseNumber(parsedRow.netAmount);
        const quantity = parseNumber(parsedRow.quantity);
        const price = parseNumber(parsedRow.price);
        const commission = parseNumber(parsedRow.commission);
        const transactionFees = parseNumber(parsedRow.transactionFees);

        // Calculate total fees
        const totalFees =
          (commission ?? 0) + (transactionFees ?? 0) || null;

        const symbol = normalizeSymbol(
          parsedRow.symbol,
          parsedRow.transactionType
        );

        const transaction: NormalizedTransaction = {
          date: parseDate(parsedRow.date),
          type: mapTransactionType(
            parsedRow.transactionType,
            netAmount,
            parsedRow.description
          ),
          symbol: symbol,
          description: parsedRow.description,
          quantity: quantity,
          price: price,
          amount: netAmount ?? 0,
          fees: totalFees,
          currency: determineCurrency(symbol, currency),
          externalId: generateExternalId(parsedRow),
          importSource: "ibkr",
          rawData: parsedRow as unknown as Record<string, string>,
        };

        transactions.push(transaction);
      }
    } else if (row[0] !== "Transaction History") {
      // We've left the Transaction History section
      if (inTransactionHistory) {
        inTransactionHistory = false;
        headerRow = null;
      }
    }
  }

  return transactions;
}

/**
 * Detect if content is IBKR format
 */
export function isIBKRFormat(csvContent: string): boolean {
  const lines = csvContent.split("\n").slice(0, 20);
  return lines.some(
    (line) =>
      line.includes("Transaction History,Header") ||
      (line.includes("Statement,Data") && line.includes("Transaction History"))
  );
}
