import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  NormalizedTransaction,
  ImportOptions,
  ImportSummary,
  TransactionImportResult,
  BrokerFormat,
} from "./types";
import { parseSchwabCSV, isSchwabFormat } from "./parsers/schwab";
import { parseIBKRCSV, isIBKRFormat } from "./parsers/ibkr";
import { parseChaseCSV, isChaseFormat } from "./parsers/chase-bank";
import { parseNBKCSV, isNBKFormat } from "./parsers/nbk";
import { parseBOFACSV, isBOFAFormat } from "./parsers/bofa";
import { findExistingTransactions, isDuplicate } from "./dedupe";
import { recalculateAccountComplete, cleanupEmptyHoldings } from "@/lib/portfolio/portfolio-service";
import { backfillTaxLotsForPortfolio } from "@/lib/portfolio/tax-lot-service";

/**
 * Generate a unique batch ID for this import
 */
function generateBatchId(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `import-${timestamp}-${random}`;
}

/**
 * Auto-detect broker format from CSV content
 */
export function detectBrokerFormat(csvContent: string): BrokerFormat | null {
  if (isSchwabFormat(csvContent)) return "schwab";
  if (isIBKRFormat(csvContent)) return "ibkr";
  if (isChaseFormat(csvContent)) return "chase_bank";
  if (isNBKFormat(csvContent)) return "nbk";
  if (isBOFAFormat(csvContent)) return "bofa";
  return null;
}

/**
 * Parse CSV content based on broker format
 * @param csvContent - The CSV content to parse
 * @param format - The broker format (schwab or ibkr)
 * @param currency - Currency code for transactions (defaults to USD)
 */
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
    case "chase_bank":
      return parseChaseCSV(csvContent, currency);
    case "nbk":
      return parseNBKCSV(csvContent, currency);
    case "bofa":
      return parseBOFACSV(csvContent, currency);
    default:
      throw new Error(`Unsupported broker format: ${format}`);
  }
}

/**
 * Create or update holding for a transaction
 * @param accountId - The account ID
 * @param symbol - The trading symbol
 * @param description - Description of the holding
 * @param transactionType - Type of transaction
 * @param currency - Currency code for the holding (defaults to USD)
 */
async function ensureHolding(
  accountId: string,
  symbol: string,
  description: string,
  transactionType: string,
  currency: string = "USD"
): Promise<string | null> {
  if (!symbol) return null;

  // Determine asset type based on symbol and transaction context
  let assetType: Prisma.HoldingCreateInput["assetType"] = "STOCK";

  // Crypto detection
  if (["BTC", "ETH", "SOL", "DOGE", "ADA", "XRP", "DOT", "LINK"].includes(symbol)) {
    assetType = "CRYPTO";
  }
  // Cash holdings (for forex)
  else if (symbol.startsWith("CASH.")) {
    assetType = "CASH";
  }
  // ETF detection (common suffixes/patterns)
  else if (
    symbol.match(/^(SPY|QQQ|IWM|DIA|VTI|VOO|VGT|VUG|VTV|BND|TIP|SCHD|XL[A-Z]|IJ[A-Z]|EW[A-Z])$/)
  ) {
    assetType = "ETF";
  }

  // Try to find existing holding
  const existing = await prisma.holding.findUnique({
    where: {
      accountId_symbol: {
        accountId,
        symbol,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  // Create new holding with zero quantity (will be calculated later)
  const holding = await prisma.holding.create({
    data: {
      accountId,
      symbol,
      name: description || symbol,
      assetType,
      quantity: 0,
      currency: currency,
    },
  });

  return holding.id;
}

/**
 * Import transactions from CSV content
 */
export async function importTransactions(
  csvContent: string,
  options: ImportOptions
): Promise<ImportSummary> {
  const { accountId, brokerFormat, dryRun = false, skipDuplicates = true, currency = "USD" } = options;

  // Verify account exists and get portfolio info for tax lot processing
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      portfolio: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Parse CSV with specified currency
  const transactions = parseCSV(csvContent, brokerFormat, currency);

  if (transactions.length === 0) {
    return {
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      results: [],
      importBatch: "",
    };
  }

  const batchId = generateBatchId();
  const results: TransactionImportResult[] = [];
  const now = new Date();

  // Find existing transactions in batch for efficiency
  const existingMap = await findExistingTransactions(transactions, accountId);

  for (const tx of transactions) {
    // Check for duplicates
    if (skipDuplicates) {
      // First check batch lookup
      if (existingMap.has(tx.externalId)) {
        results.push({
          transaction: tx,
          status: "skipped",
          reason: "Duplicate (externalId match)",
          dbId: existingMap.get(tx.externalId),
        });
        continue;
      }

      // Then do individual check for composite key match
      const dupeCheck = await isDuplicate(tx, accountId);
      if (dupeCheck.isDuplicate) {
        results.push({
          transaction: tx,
          status: "skipped",
          reason: `Duplicate: ${dupeCheck.reason}`,
          dbId: dupeCheck.existingId,
        });
        continue;
      }
    }

    // Dry run - don't actually insert
    if (dryRun) {
      results.push({
        transaction: tx,
        status: "imported",
        reason: "Dry run - would be imported",
      });
      continue;
    }

    try {
      // Ensure holding exists if we have a symbol
      const holdingId = tx.symbol
        ? await ensureHolding(accountId, tx.symbol, tx.description, tx.type, tx.currency)
        : null;

      // Create transaction
      const created = await prisma.portfolioTransaction.create({
        data: {
          accountId,
          holdingId,
          type: tx.type,
          symbol: tx.symbol,
          quantity: tx.quantity !== null ? new Prisma.Decimal(tx.quantity) : null,
          price: tx.price !== null ? new Prisma.Decimal(tx.price) : null,
          amount: new Prisma.Decimal(tx.amount),
          fees: tx.fees !== null ? new Prisma.Decimal(tx.fees) : null,
          currency: tx.currency,
          date: tx.date,
          notes: tx.description,
          externalId: tx.externalId,
          importedAt: now,
          importSource: tx.importSource,
          importBatch: batchId,
          // Bank transaction categorization fields
          category: tx.category,
          merchant: tx.merchant,
          isRecurring: tx.isRecurring ?? false,
          categorySource: tx.category ? "auto" : null,
        },
      });

      results.push({
        transaction: tx,
        status: "imported",
        dbId: created.id,
      });
    } catch (error) {
      console.error("Error importing transaction:", error);
      results.push({
        transaction: tx,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Calculate summary
  const summary: ImportSummary = {
    total: transactions.length,
    imported: results.filter((r) => r.status === "imported").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
    importBatch: batchId,
  };

  // Recalculate holdings after import (only if we actually imported something)
  if (!dryRun && summary.imported > 0) {
    try {
      // Clean up any incorrectly created holdings (forex pairs, empty)
      await cleanupEmptyHoldings(accountId);
      // Recalculate all holdings and cash balance for this account
      await recalculateAccountComplete(accountId);
      // Process tax lots for all transactions (creates lots for BUYs, calculates realized gains for SELLs)
      const taxLotResult = await backfillTaxLotsForPortfolio(
        account.portfolio.id,
        account.portfolio.userId
      );
      console.log(
        `Tax lot processing: ${taxLotResult.created} lots created, ${taxLotResult.consumed} sales processed`
      );
      if (taxLotResult.errors.length > 0) {
        console.warn("Tax lot processing errors:", taxLotResult.errors);
      }
    } catch (error) {
      console.error("Error in post-import processing:", error);
      // Don't fail the import if post-processing fails
    }
  }

  return summary;
}

/**
 * Rollback an import batch
 */
export async function rollbackImport(batchId: string): Promise<number> {
  const result = await prisma.portfolioTransaction.deleteMany({
    where: { importBatch: batchId },
  });

  return result.count;
}

/**
 * Get import history for an account
 */
export async function getImportHistory(accountId: string) {
  const batches = await prisma.portfolioTransaction.groupBy({
    by: ["importBatch", "importSource"],
    where: {
      accountId,
      importBatch: { not: null },
    },
    _count: { id: true },
    _min: { importedAt: true },
    orderBy: { _min: { importedAt: "desc" } },
  });

  return batches.map((b) => ({
    batchId: b.importBatch,
    source: b.importSource,
    count: b._count.id,
    importedAt: b._min.importedAt,
  }));
}
