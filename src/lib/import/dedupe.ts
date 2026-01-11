import { prisma } from "@/lib/prisma";
import { NormalizedTransaction } from "./types";

/**
 * Check if a transaction already exists in the database
 *
 * Strategy:
 * 1. First check by externalId (most reliable)
 * 2. Then check by composite key (date + symbol + type + amount)
 */
export async function isDuplicate(
  transaction: NormalizedTransaction,
  accountId: string
): Promise<{ isDuplicate: boolean; existingId?: string; reason?: string }> {
  // Check by externalId first (exact match)
  if (transaction.externalId) {
    const existing = await prisma.portfolioTransaction.findFirst({
      where: {
        accountId,
        externalId: transaction.externalId,
      },
      select: { id: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingId: existing.id,
        reason: "Matching externalId",
      };
    }
  }

  // Check by composite key (date + symbol + type + amount)
  // Skip composite check for bank transactions (symbol is null) since externalId is sufficient
  // Bank transactions can have multiple similar-amount transactions on the same day
  if (transaction.symbol !== null) {
    // Use a time window of same day for date matching
    const startOfDay = new Date(transaction.date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(transaction.date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.portfolioTransaction.findFirst({
      where: {
        accountId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        type: transaction.type,
        symbol: transaction.symbol,
        amount: {
          // Allow small floating point differences
          gte: transaction.amount - 0.01,
          lte: transaction.amount + 0.01,
        },
        // Also match quantity if present
        ...(transaction.quantity !== null && {
          quantity: {
            gte: transaction.quantity - 0.0001,
            lte: transaction.quantity + 0.0001,
          },
        }),
      },
      select: { id: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingId: existing.id,
        reason: "Matching date, type, symbol, and amount",
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Batch check for duplicates
 * Returns a Map of externalId -> existing transaction ID
 */
export async function findExistingTransactions(
  transactions: NormalizedTransaction[],
  accountId: string
): Promise<Map<string, string>> {
  const externalIds = transactions
    .map((t) => t.externalId)
    .filter((id): id is string => id !== null);

  if (externalIds.length === 0) {
    return new Map();
  }

  const existing = await prisma.portfolioTransaction.findMany({
    where: {
      accountId,
      externalId: { in: externalIds },
    },
    select: { id: true, externalId: true },
  });

  const map = new Map<string, string>();
  for (const tx of existing) {
    if (tx.externalId) {
      map.set(tx.externalId, tx.id);
    }
  }

  return map;
}
