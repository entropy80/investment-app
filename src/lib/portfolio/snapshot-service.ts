/**
 * Portfolio Snapshot Service
 *
 * Calculates and stores daily portfolio value snapshots for historical performance tracking.
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"

// ============================================================================
// Types
// ============================================================================

export interface SnapshotData {
  date: Date
  totalValue: number
  costBasis: number
  cashValue: number
  gainLoss: number
  gainLossPct: number
}

export interface HistoryPeriod {
  startDate: Date
  endDate: Date
  dataPoints: SnapshotData[]
}

// ============================================================================
// Snapshot Creation
// ============================================================================

/**
 * Create or update a portfolio snapshot for a specific date
 */
export async function createSnapshot(
  portfolioId: string,
  date: Date,
  data: {
    totalValue: number
    costBasis: number
    cashValue: number
  }
): Promise<void> {
  const gainLoss = data.totalValue - data.costBasis
  const gainLossPct = data.costBasis > 0 ? (gainLoss / data.costBasis) * 100 : 0

  // Normalize date to start of day (UTC)
  const snapshotDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ))

  await prisma.portfolioSnapshot.upsert({
    where: {
      portfolioId_date: {
        portfolioId,
        date: snapshotDate,
      },
    },
    update: {
      totalValue: new Decimal(data.totalValue).toDecimalPlaces(2),
      costBasis: new Decimal(data.costBasis).toDecimalPlaces(2),
      cashValue: new Decimal(data.cashValue).toDecimalPlaces(2),
      gainLoss: new Decimal(gainLoss).toDecimalPlaces(2),
      gainLossPct: new Decimal(gainLossPct).toDecimalPlaces(4),
    },
    create: {
      portfolioId,
      date: snapshotDate,
      totalValue: new Decimal(data.totalValue).toDecimalPlaces(2),
      costBasis: new Decimal(data.costBasis).toDecimalPlaces(2),
      cashValue: new Decimal(data.cashValue).toDecimalPlaces(2),
      gainLoss: new Decimal(gainLoss).toDecimalPlaces(2),
      gainLossPct: new Decimal(gainLossPct).toDecimalPlaces(4),
    },
  })
}

/**
 * Create a snapshot for today using current portfolio values
 */
export async function createTodaySnapshot(
  portfolioId: string,
  userId: string
): Promise<void> {
  // Get portfolio with accounts and holdings
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        include: {
          holdings: {
            include: {
              priceHistory: {
                orderBy: { snapshotAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!portfolio) {
    throw new Error("Portfolio not found")
  }

  // Get exchange rates for currency conversion (USD -> other currencies)
  const exchangeRates = await prisma.exchangeRate.findMany({
    where: { fromCurrencyId: "USD" },
    include: {
      toCurrency: { select: { code: true } },
    },
  })
  const rateMap = new Map<string, number>()
  for (const rate of exchangeRates) {
    rateMap.set(rate.toCurrency.code, Number(rate.rate))
  }

  let totalValue = 0
  let totalCostBasis = 0
  let cashValue = 0

  for (const account of portfolio.accounts) {
    for (const holding of account.holdings) {
      const quantity = Number(holding.quantity)
      const costBasis = Number(holding.costBasis || 0)

      // Skip zero quantity holdings
      if (quantity === 0) continue

      // Handle cash holdings
      if (holding.symbol.startsWith("CASH.")) {
        const currency = holding.symbol.replace("CASH.", "")
        let valueInUSD = quantity

        if (currency !== "USD") {
          const rate = rateMap.get(currency)
          if (rate) {
            valueInUSD = quantity / rate // Convert to USD
          }
        }

        cashValue += valueInUSD
        totalValue += valueInUSD
        totalCostBasis += costBasis
        continue
      }

      // Get latest price for non-cash holdings
      const latestPrice = holding.priceHistory[0]
      if (latestPrice) {
        const currentValue = quantity * Number(latestPrice.price)
        totalValue += currentValue
      } else {
        // If no price, use cost basis as estimate
        totalValue += costBasis
      }

      totalCostBasis += costBasis
    }
  }

  await createSnapshot(portfolioId, new Date(), {
    totalValue,
    costBasis: totalCostBasis,
    cashValue,
  })
}

// ============================================================================
// Snapshot Retrieval
// ============================================================================

/**
 * Get portfolio history for a specific period
 */
export async function getPortfolioHistory(
  portfolioId: string,
  userId: string,
  period: "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL"
): Promise<HistoryPeriod | null> {
  // Verify portfolio ownership
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
  })

  if (!portfolio) {
    return null
  }

  // Calculate date range
  const endDate = new Date()
  let startDate: Date

  switch (period) {
    case "1M":
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)
      break
    case "3M":
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      break
    case "6M":
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6)
      break
    case "1Y":
      startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
    case "YTD":
      startDate = new Date(endDate.getFullYear(), 0, 1)
      break
    case "ALL":
    default:
      // Get earliest snapshot
      const earliest = await prisma.portfolioSnapshot.findFirst({
        where: { portfolioId },
        orderBy: { date: "asc" },
        select: { date: true },
      })
      startDate = earliest?.date || new Date()
      break
  }

  // Fetch snapshots
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      portfolioId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  })

  const dataPoints: SnapshotData[] = snapshots.map((s) => ({
    date: s.date,
    totalValue: Number(s.totalValue),
    costBasis: Number(s.costBasis),
    cashValue: Number(s.cashValue),
    gainLoss: Number(s.gainLoss),
    gainLossPct: Number(s.gainLossPct),
  }))

  return {
    startDate,
    endDate,
    dataPoints,
  }
}

/**
 * Get the latest snapshot for a portfolio
 */
export async function getLatestSnapshot(
  portfolioId: string
): Promise<SnapshotData | null> {
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { portfolioId },
    orderBy: { date: "desc" },
  })

  if (!snapshot) {
    return null
  }

  return {
    date: snapshot.date,
    totalValue: Number(snapshot.totalValue),
    costBasis: Number(snapshot.costBasis),
    cashValue: Number(snapshot.cashValue),
    gainLoss: Number(snapshot.gainLoss),
    gainLossPct: Number(snapshot.gainLossPct),
  }
}

/**
 * Get performance metrics between two dates
 */
export async function getPerformanceMetrics(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  startValue: number
  endValue: number
  absoluteChange: number
  percentChange: number
} | null> {
  const [startSnapshot, endSnapshot] = await Promise.all([
    prisma.portfolioSnapshot.findFirst({
      where: {
        portfolioId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    }),
    prisma.portfolioSnapshot.findFirst({
      where: {
        portfolioId,
        date: { lte: endDate },
      },
      orderBy: { date: "desc" },
    }),
  ])

  if (!startSnapshot || !endSnapshot) {
    return null
  }

  const startValue = Number(startSnapshot.totalValue)
  const endValue = Number(endSnapshot.totalValue)
  const absoluteChange = endValue - startValue
  const percentChange = startValue > 0 ? (absoluteChange / startValue) * 100 : 0

  return {
    startValue,
    endValue,
    absoluteChange,
    percentChange,
  }
}

// ============================================================================
// Backfill Utilities
// ============================================================================

/**
 * Get all dates that need snapshots (days with transactions but no snapshot)
 */
export async function getMissingSnapshotDates(
  portfolioId: string
): Promise<Date[]> {
  // Get all unique transaction dates
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      accounts: {
        select: { id: true },
      },
    },
  })

  if (!portfolio) {
    return []
  }

  const accountIds = portfolio.accounts.map((a) => a.id)

  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
    },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "asc" },
  })

  // Get existing snapshot dates
  const existingSnapshots = await prisma.portfolioSnapshot.findMany({
    where: { portfolioId },
    select: { date: true },
  })

  const existingDates = new Set(
    existingSnapshots.map((s) => s.date.toISOString().split("T")[0])
  )

  // Find missing dates
  const missingDates: Date[] = []
  for (const tx of transactions) {
    const dateStr = tx.date.toISOString().split("T")[0]
    if (!existingDates.has(dateStr)) {
      missingDates.push(tx.date)
    }
  }

  return missingDates
}

/**
 * Delete all snapshots for a portfolio (useful before re-backfilling)
 */
export async function clearSnapshots(portfolioId: string): Promise<number> {
  const result = await prisma.portfolioSnapshot.deleteMany({
    where: { portfolioId },
  })
  return result.count
}
