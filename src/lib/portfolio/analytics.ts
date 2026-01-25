import { prisma } from '@/lib/prisma'
import {
  Holding,
  PriceSnapshot,
  PortfolioTransaction,
  AssetType,
  PortfolioTransactionType,
} from '@prisma/client'
import Decimal from 'decimal.js'
import { getExchangeRate } from '@/lib/currency/currency-service'

// ============================================================================
// Type Definitions
// ============================================================================

export interface PerformanceMetrics {
  totalReturn: number          // Absolute return in currency
  totalReturnPercent: number   // Percentage return
  cagr: number                 // Compound Annual Growth Rate
  volatility?: number          // Standard deviation of returns
  sharpeRatio?: number         // Risk-adjusted return
  maxDrawdown?: number         // Maximum peak-to-trough decline
}

export interface HoldingPerformance {
  holdingId: string
  symbol: string
  name: string
  assetType: AssetType
  quantity: number
  costBasis: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
  dayChange?: number
  dayChangePercent?: number
}

export interface DividendSummary {
  totalDividends: number
  annualizedYield: number
  dividendsBySymbol: { symbol: string; total: number; count: number }[]
  recentDividends: PortfolioTransaction[]
  projectedAnnual: number
}

export interface AllocationData {
  byAssetType: { type: AssetType; value: number; percentage: number }[]
  byAccount: { accountId: string; name: string; value: number; percentage: number }[]
  bySymbol: { symbol: string; name: string; value: number; percentage: number }[]
  bySector?: { sector: string; value: number; percentage: number }[]
}

export interface PortfolioSnapshot {
  date: Date
  totalValue: number
  costBasis: number
  gainLoss: number
}

// ============================================================================
// Performance Calculations
// ============================================================================

/**
 * Calculate performance metrics for a portfolio
 */
export async function calculatePerformanceMetrics(
  portfolioId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PerformanceMetrics | null> {
  // Get portfolio with all holdings
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        include: {
          holdings: {
            include: {
              priceHistory: {
                orderBy: { snapshotAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!portfolio) {
    return null
  }

  let totalCostBasis = 0
  let totalCurrentValue = 0

  for (const account of portfolio.accounts) {
    for (const holding of account.holdings) {
      const quantity = Number(holding.quantity)
      const costBasis = holding.costBasis ? Number(holding.costBasis) : 0
      const latestPrice = holding.priceHistory[0]?.price
        ? Number(holding.priceHistory[0].price)
        : holding.avgCostPerUnit
        ? Number(holding.avgCostPerUnit)
        : 0

      totalCostBasis += costBasis
      totalCurrentValue += quantity * latestPrice
    }
  }

  const totalReturn = totalCurrentValue - totalCostBasis
  const totalReturnPercent = totalCostBasis > 0
    ? (totalReturn / totalCostBasis) * 100
    : 0

  // Calculate CAGR (simplified - would need actual time period)
  // Using portfolio creation date as start
  const portfolioAgeInYears = Math.max(
    (Date.now() - new Date(portfolio.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    1/365 // Minimum 1 day
  )

  const cagr = totalCostBasis > 0
    ? (Math.pow(totalCurrentValue / totalCostBasis, 1 / portfolioAgeInYears) - 1) * 100
    : 0

  return {
    totalReturn,
    totalReturnPercent,
    cagr,
  }
}

/**
 * Calculate performance for individual holdings
 */
export async function calculateHoldingPerformance(
  portfolioId: string,
  userId: string
): Promise<HoldingPerformance[]> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        include: {
          holdings: {
            include: {
              priceHistory: {
                orderBy: { snapshotAt: 'desc' },
                take: 2, // Get latest and previous for day change
              },
            },
          },
        },
      },
    },
  })

  if (!portfolio) {
    return []
  }

  const performances: HoldingPerformance[] = []

  for (const account of portfolio.accounts) {
    for (const holding of account.holdings) {
      const quantity = Number(holding.quantity)
      const costBasis = holding.costBasis ? Number(holding.costBasis) : 0
      const latestPrice = holding.priceHistory[0]?.price
        ? Number(holding.priceHistory[0].price)
        : holding.avgCostPerUnit
        ? Number(holding.avgCostPerUnit)
        : 0
      const previousPrice = holding.priceHistory[1]?.price
        ? Number(holding.priceHistory[1].price)
        : latestPrice

      const currentValue = quantity * latestPrice
      const gainLoss = currentValue - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

      const dayChange = (latestPrice - previousPrice) * quantity
      const dayChangePercent = previousPrice > 0
        ? ((latestPrice - previousPrice) / previousPrice) * 100
        : 0

      performances.push({
        holdingId: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
        quantity,
        costBasis,
        currentValue,
        gainLoss,
        gainLossPercent,
        dayChange,
        dayChangePercent,
      })
    }
  }

  // Sort by current value (largest first)
  return performances.sort((a, b) => b.currentValue - a.currentValue)
}

// ============================================================================
// Dividend Analytics
// ============================================================================

/**
 * Calculate dividend summary for a portfolio
 */
export async function calculateDividendSummary(
  portfolioId: string,
  userId: string,
  year?: number
): Promise<DividendSummary | null> {
  // Verify ownership
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        select: { id: true },
      },
    },
  })

  if (!portfolio) {
    return null
  }

  const accountIds = portfolio.accounts.map(a => a.id)

  // Get dividend transactions
  const startDate = year
    ? new Date(year, 0, 1)
    : new Date(new Date().getFullYear(), 0, 1)
  const endDate = year
    ? new Date(year, 11, 31, 23, 59, 59)
    : new Date()

  const dividends = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: 'DIVIDEND',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'desc' },
  })

  // Calculate totals
  let totalDividends = 0
  const symbolTotals = new Map<string, { total: number; count: number }>()

  for (const div of dividends) {
    const amount = Number(div.amount)
    totalDividends += amount

    const symbol = div.symbol || 'Unknown'
    const existing = symbolTotals.get(symbol) || { total: 0, count: 0 }
    symbolTotals.set(symbol, {
      total: existing.total + amount,
      count: existing.count + 1,
    })
  }

  // Get current portfolio value for yield calculation
  let portfolioValue = 0
  const holdings = await prisma.holding.findMany({
    where: { accountId: { in: accountIds } },
    include: {
      priceHistory: {
        orderBy: { snapshotAt: 'desc' },
        take: 1,
      },
    },
  })

  for (const holding of holdings) {
    const quantity = Number(holding.quantity)
    const price = holding.priceHistory[0]?.price
      ? Number(holding.priceHistory[0].price)
      : holding.avgCostPerUnit
      ? Number(holding.avgCostPerUnit)
      : 0
    portfolioValue += quantity * price
  }

  const annualizedYield = portfolioValue > 0
    ? (totalDividends / portfolioValue) * 100
    : 0

  // Project annual dividends based on recent history
  const monthsOfData = Math.min(12, dividends.length > 0 ?
    Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)) : 12)
  const projectedAnnual = monthsOfData > 0
    ? (totalDividends / monthsOfData) * 12
    : 0

  return {
    totalDividends,
    annualizedYield,
    dividendsBySymbol: Array.from(symbolTotals.entries())
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.total - a.total),
    recentDividends: dividends.slice(0, 10),
    projectedAnnual,
  }
}

// ============================================================================
// Asset Allocation
// ============================================================================

/**
 * Calculate asset allocation breakdown
 */
export async function calculateAllocation(
  portfolioId: string,
  userId: string
): Promise<AllocationData | null> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        include: {
          holdings: {
            include: {
              priceHistory: {
                orderBy: { snapshotAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!portfolio) {
    return null
  }

  let totalValue = 0
  const byAssetType = new Map<AssetType, number>()
  const byAccount = new Map<string, { name: string; value: number }>()
  const bySymbol = new Map<string, { name: string; value: number }>()

  for (const account of portfolio.accounts) {
    let accountValue = 0

    for (const holding of account.holdings) {
      const quantity = Number(holding.quantity)
      const price = holding.priceHistory[0]?.price
        ? Number(holding.priceHistory[0].price)
        : holding.avgCostPerUnit
        ? Number(holding.avgCostPerUnit)
        : 0

      const value = quantity * price
      totalValue += value
      accountValue += value

      // By asset type
      const existingType = byAssetType.get(holding.assetType) || 0
      byAssetType.set(holding.assetType, existingType + value)

      // By symbol
      const existingSymbol = bySymbol.get(holding.symbol) || { name: holding.name, value: 0 }
      bySymbol.set(holding.symbol, {
        name: holding.name,
        value: existingSymbol.value + value,
      })
    }

    byAccount.set(account.id, { name: account.name, value: accountValue })
  }

  // Convert to arrays with percentages
  const byAssetTypeArray = Array.from(byAssetType.entries())
    .map(([type, value]) => ({
      type,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const byAccountArray = Array.from(byAccount.entries())
    .map(([accountId, data]) => ({
      accountId,
      name: data.name,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const bySymbolArray = Array.from(bySymbol.entries())
    .map(([symbol, data]) => ({
      symbol,
      name: data.name,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    byAssetType: byAssetTypeArray,
    byAccount: byAccountArray,
    bySymbol: bySymbolArray,
  }
}

// ============================================================================
// Historical Performance
// ============================================================================

/**
 * Generate portfolio value history for charting
 */
export async function getPortfolioHistory(
  portfolioId: string,
  userId: string,
  period: '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL' = '1Y'
): Promise<PortfolioSnapshot[]> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        select: { id: true },
      },
    },
  })

  if (!portfolio) {
    return []
  }

  // Calculate start date based on period
  const now = new Date()
  let startDate: Date

  switch (period) {
    case '1M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      break
    case '3M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      break
    case '6M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    case '1Y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'ALL':
      startDate = new Date(portfolio.createdAt)
      break
  }

  const accountIds = portfolio.accounts.map(a => a.id)

  // Get all holdings with their price history
  const holdings = await prisma.holding.findMany({
    where: { accountId: { in: accountIds } },
    include: {
      priceHistory: {
        where: {
          snapshotAt: { gte: startDate },
        },
        orderBy: { snapshotAt: 'asc' },
      },
    },
  })

  // Group price snapshots by date
  const dateMap = new Map<string, Map<string, { price: number; quantity: number; costBasis: number }>>()

  for (const holding of holdings) {
    const quantity = Number(holding.quantity)
    const costBasis = holding.costBasis ? Number(holding.costBasis) : 0

    for (const snapshot of holding.priceHistory) {
      const dateKey = snapshot.snapshotAt.toISOString().split('T')[0]

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map())
      }

      dateMap.get(dateKey)!.set(holding.id, {
        price: Number(snapshot.price),
        quantity,
        costBasis,
      })
    }
  }

  // Convert to snapshots array
  const snapshots: PortfolioSnapshot[] = []

  for (const [dateStr, holdingsMap] of Array.from(dateMap.entries()).sort()) {
    let totalValue = 0
    let totalCostBasis = 0

    for (const [_, data] of holdingsMap) {
      totalValue += data.price * data.quantity
      totalCostBasis += data.costBasis
    }

    snapshots.push({
      date: new Date(dateStr),
      totalValue,
      costBasis: totalCostBasis,
      gainLoss: totalValue - totalCostBasis,
    })
  }

  return snapshots
}

// ============================================================================
// Benchmark Comparison
// ============================================================================

export interface BenchmarkComparison {
  portfolioReturn: number
  benchmarkReturn: number
  alpha: number // Outperformance vs benchmark
  period: string
}

/**
 * Compare portfolio performance against a benchmark
 * Note: This is a placeholder - real implementation would fetch benchmark data from an API
 */
export async function compareToBenchmark(
  portfolioId: string,
  userId: string,
  benchmark: 'SP500' | 'NASDAQ' | 'DOW' = 'SP500',
  period: '1M' | '3M' | '6M' | '1Y' | 'YTD' = '1Y'
): Promise<BenchmarkComparison | null> {
  const metrics = await calculatePerformanceMetrics(portfolioId, userId)

  if (!metrics) {
    return null
  }

  // Placeholder benchmark returns - in production, fetch from financial API
  const benchmarkReturns: Record<string, Record<string, number>> = {
    SP500: { '1M': 2.5, '3M': 5.2, '6M': 8.1, '1Y': 12.5, 'YTD': 10.3 },
    NASDAQ: { '1M': 3.2, '3M': 7.1, '6M': 12.3, '1Y': 18.2, 'YTD': 15.1 },
    DOW: { '1M': 1.8, '3M': 4.5, '6M': 6.9, '1Y': 10.1, 'YTD': 8.5 },
  }

  const benchmarkReturn = benchmarkReturns[benchmark]?.[period] || 0

  return {
    portfolioReturn: metrics.totalReturnPercent,
    benchmarkReturn,
    alpha: metrics.totalReturnPercent - benchmarkReturn,
    period,
  }
}

// ============================================================================
// Tax Calculations
// ============================================================================

export interface TaxLot {
  symbol: string
  quantity: number
  costBasis: number
  purchaseDate: Date
  currentValue: number
  unrealizedGainLoss: number
  holdingPeriod: 'SHORT_TERM' | 'LONG_TERM'
}

export interface RealizedGainLoss {
  symbol: string
  quantity: number
  proceeds: number
  costBasis: number
  gainLoss: number
  type: 'SHORT_TERM' | 'LONG_TERM'
  date: Date
}

/**
 * Calculate unrealized gains/losses with tax lot information
 */
export async function calculateUnrealizedGains(
  portfolioId: string,
  userId: string
): Promise<TaxLot[]> {
  const holdings = await calculateHoldingPerformance(portfolioId, userId)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  // Simplified - assumes all holdings purchased at the same time
  // Real implementation would track individual tax lots
  return holdings.map(h => ({
    symbol: h.symbol,
    quantity: h.quantity,
    costBasis: h.costBasis,
    purchaseDate: new Date(), // Would need actual purchase date
    currentValue: h.currentValue,
    unrealizedGainLoss: h.gainLoss,
    holdingPeriod: 'LONG_TERM' as const, // Simplified
  }))
}

/**
 * Calculate realized gains/losses from sell transactions
 */
export async function calculateRealizedGains(
  portfolioId: string,
  userId: string,
  year: number
): Promise<{ shortTerm: number; longTerm: number; total: number; transactions: RealizedGainLoss[] }> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        select: { id: true },
      },
    },
  })

  if (!portfolio) {
    return { shortTerm: 0, longTerm: 0, total: 0, transactions: [] }
  }

  const accountIds = portfolio.accounts.map(a => a.id)

  const sellTransactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: 'SELL',
      date: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      },
    },
    orderBy: { date: 'desc' },
  })

  // Simplified calculation - real implementation needs cost basis tracking
  let shortTerm = 0
  let longTerm = 0
  const transactions: RealizedGainLoss[] = []

  for (const tx of sellTransactions) {
    const proceeds = Number(tx.amount)
    const quantity = tx.quantity ? Number(tx.quantity) : 0
    const price = tx.price ? Number(tx.price) : 0
    const fees = tx.fees ? Number(tx.fees) : 0

    // Simplified: assume 10% profit (real implementation needs FIFO/LIFO tracking)
    const estimatedCostBasis = proceeds * 0.9
    const gainLoss = proceeds - estimatedCostBasis - fees

    // Simplified: assume all long-term
    longTerm += gainLoss

    transactions.push({
      symbol: tx.symbol || 'Unknown',
      quantity,
      proceeds,
      costBasis: estimatedCostBasis,
      gainLoss,
      type: 'LONG_TERM',
      date: tx.date,
    })
  }

  return {
    shortTerm,
    longTerm,
    total: shortTerm + longTerm,
    transactions,
  }
}

// ============================================================================
// Bank Account Summary
// ============================================================================

export interface CategorySummary {
  category: string
  amount: number
  count: number
}

export interface MatchedTransfer {
  fromAccount: string
  fromAccountName: string
  toAccount: string
  toAccountName: string
  amount: number      // Original amount in source currency
  amountUSD: number   // Amount converted to USD for consistent calculations
  fromCurrency: string
  toCurrency: string
  date: Date
  confidence: 'high' | 'medium' | 'low'
}

export interface InternalTransferSummary {
  fromAccountName: string
  toAccountName: string
  totalAmount: number
  count: number
}

export interface BankSummaryData {
  // Original fields (for backward compatibility)
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  incomeByCategory: CategorySummary[]
  expensesByCategory: CategorySummary[]

  // New fields for enhanced analysis
  trueIncome: number              // Excludes internal transfers
  trueExpenses: number            // Excludes transfers to own accounts
  investmentContributions: number // Transfers to brokerage accounts
  internalTransfers: MatchedTransfer[]
  internalTransferSummary: InternalTransferSummary[]
  trueSavingsRate: number | null  // Based on true income/expenses
}

// Income categories
const INCOME_CATEGORIES = [
  'SALARY',
  'RENTAL_INCOME',
  'ALLOWANCE',
  'INVESTMENT_INCOME',
  'REFUND',
  'OTHER_INCOME',
]

// Transfer-related categories and types
const TRANSFER_CATEGORIES = ['TRANSFER', 'INVESTMENT', 'SAVINGS']
// Explicit transfer types - these are always considered potential internal transfers
const EXPLICIT_TRANSFER_TYPES: PortfolioTransactionType[] = ['TRANSFER_IN', 'TRANSFER_OUT']
// Generic types that are only considered transfers if they have a transfer category
const GENERIC_TRANSFER_TYPES: PortfolioTransactionType[] = ['DEPOSIT', 'WITHDRAWAL']
// Combined for backward compatibility
const TRANSFER_TYPES: PortfolioTransactionType[] = [...EXPLICIT_TRANSFER_TYPES, ...GENERIC_TRANSFER_TYPES]

// Investment transaction types - not real income/expenses, just moving assets
const INVESTMENT_TYPES: PortfolioTransactionType[] = ['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']

// Transaction with account info for transfer matching
interface TransactionWithAccount {
  id: string
  accountId: string
  accountName: string
  accountType: string
  amount: number
  amountUSD: number  // Amount converted to USD for cross-currency matching
  currency: string
  date: Date
  category: string | null
  type: PortfolioTransactionType
}

/**
 * Match internal transfers between accounts in the same portfolio.
 * Matches outgoing transactions with incoming ones based on:
 * - Amount in USD within tolerance (±2% or ±$50) - handles cross-currency transfers
 * - Date within ±3 days
 * - Different accounts
 */
function matchInternalTransfers(
  transactions: TransactionWithAccount[]
): MatchedTransfer[] {
  const matchedTransfers: MatchedTransfer[] = []
  const matchedTxIds = new Set<string>()

  // Helper to determine if a transaction is likely an internal transfer
  // More restrictive to avoid matching regular expenses/income as transfers
  const isLikelyTransfer = (tx: TransactionWithAccount, expectedDirection: 'outgoing' | 'incoming'): boolean => {
    const isTransferCategory = tx.category && TRANSFER_CATEGORIES.includes(tx.category)
    const isGenericType = GENERIC_TRANSFER_TYPES.includes(tx.type)

    // For explicit transfer types, verify the amount sign matches the expected direction
    // TRANSFER_OUT should have negative amounts, TRANSFER_IN should have positive
    const isValidTransferOut = tx.type === 'TRANSFER_OUT' && tx.amount < 0
    const isValidTransferIn = tx.type === 'TRANSFER_IN' && tx.amount > 0

    // Only count explicit transfer types if the amount direction is correct
    const isValidExplicitTransfer = expectedDirection === 'outgoing' ? isValidTransferOut : isValidTransferIn

    // For generic DEPOSIT/WITHDRAWAL, only consider them transfers if:
    // 1. They have an explicit transfer category, OR
    // 2. The USD amount is large enough (>$500) to likely be an intentional transfer
    const isLargeAmount = Math.abs(tx.amountUSD) >= 500
    const isValidGenericTransfer = isGenericType && (isTransferCategory || isLargeAmount)

    return isValidExplicitTransfer || isTransferCategory || isValidGenericTransfer
  }

  // Get outgoing transactions (negative amounts that are likely transfers)
  const outgoing = transactions.filter(tx => {
    const isOutgoing = tx.amount < 0
    return isOutgoing && isLikelyTransfer(tx, 'outgoing')
  })

  // Get incoming transactions (positive amounts that are likely transfers)
  const incoming = transactions.filter(tx => {
    const isIncoming = tx.amount > 0
    return isIncoming && isLikelyTransfer(tx, 'incoming')
  })

  for (const out of outgoing) {
    if (matchedTxIds.has(out.id)) continue

    // Use USD amount for matching to handle cross-currency transfers
    const outAmountUSD = Math.abs(out.amountUSD)
    const outDate = out.date.getTime()
    const threeDays = 3 * 24 * 60 * 60 * 1000

    // Find matching incoming transaction
    const candidates = incoming.filter(inc => {
      if (matchedTxIds.has(inc.id)) return false
      if (inc.accountId === out.accountId) return false // Must be different account

      // Use USD amount for comparison to handle cross-currency transfers
      const incAmountUSD = inc.amountUSD
      const incDate = inc.date.getTime()

      // Amount tolerance: ±2% or ±$50 (for fees) - based on USD amounts
      const amountDiff = Math.abs(outAmountUSD - incAmountUSD)
      const percentDiff = amountDiff / outAmountUSD
      const amountMatches = percentDiff <= 0.02 || amountDiff <= 50

      // Date tolerance: ±3 days
      const dateDiff = Math.abs(outDate - incDate)
      const dateMatches = dateDiff <= threeDays

      return amountMatches && dateMatches
    })

    if (candidates.length > 0) {
      // Pick best match: closest date, then closest USD amount
      candidates.sort((a, b) => {
        const dateDiffA = Math.abs(a.date.getTime() - outDate)
        const dateDiffB = Math.abs(b.date.getTime() - outDate)
        if (dateDiffA !== dateDiffB) return dateDiffA - dateDiffB

        const amountDiffA = Math.abs(a.amountUSD - outAmountUSD)
        const amountDiffB = Math.abs(b.amountUSD - outAmountUSD)
        return amountDiffA - amountDiffB
      })

      const match = candidates[0]
      matchedTxIds.add(out.id)
      matchedTxIds.add(match.id)

      // Determine confidence based on USD amounts
      const amountDiffUSD = Math.abs(outAmountUSD - match.amountUSD)
      const dateDiff = Math.abs(out.date.getTime() - match.date.getTime())
      const oneDay = 24 * 60 * 60 * 1000

      let confidence: 'high' | 'medium' | 'low' = 'low'
      if (amountDiffUSD <= 5 && dateDiff <= oneDay) {
        // High confidence: amounts within $5 and same day
        confidence = 'high'
      } else if (amountDiffUSD <= 50 && dateDiff <= 2 * oneDay) {
        // Medium confidence: amounts within $50 and 2 days
        confidence = 'medium'
      }

      matchedTransfers.push({
        fromAccount: out.accountId,
        fromAccountName: out.accountName,
        toAccount: match.accountId,
        toAccountName: match.accountName,
        amount: Math.abs(out.amount),
        amountUSD: outAmountUSD,
        fromCurrency: out.currency,
        toCurrency: match.currency,
        date: out.date,
        confidence,
      })
    }
  }

  return matchedTransfers
}

/**
 * Check if an account is a brokerage/investment account
 */
function isBrokerageAccount(accountType: string | undefined): boolean {
  if (!accountType) return false
  const brokerageTypes = ['BROKERAGE', 'RETIREMENT', 'IRA', '401K', 'INVESTMENT']
  return brokerageTypes.some(t => accountType.toUpperCase().includes(t))
}

/**
 * Calculate bank account summary - income vs expenses by category
 * Enhanced to detect and exclude internal transfers
 */
export async function calculateBankSummary(
  portfolioId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<BankSummaryData | null> {
  // Get portfolio with accounts to verify access
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        select: { id: true, name: true, accountType: true },
      },
    },
  })

  if (!portfolio) {
    return null
  }

  const accountIds = portfolio.accounts.map((a) => a.id)
  const accountMap = new Map(portfolio.accounts.map(a => [a.id, a]))

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) {
    dateFilter.gte = startDate
  }
  if (endDate) {
    dateFilter.lte = endDate
  }

  // Get ALL transactions (not just categorized) for transfer detection
  const rawTransactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    },
    select: {
      id: true,
      accountId: true,
      category: true,
      amount: true,
      currency: true,
      type: true,
      date: true,
    },
  })

  // Get unique currencies used in transactions for exchange rate lookup
  const uniqueCurrencies = [...new Set(rawTransactions.map(tx => tx.currency))]

  // Fetch exchange rates for all currencies to USD
  const exchangeRates = new Map<string, number>()
  exchangeRates.set('USD', 1) // USD to USD is 1:1

  for (const currency of uniqueCurrencies) {
    if (currency !== 'USD') {
      const rate = await getExchangeRate(currency, 'USD')
      if (rate) {
        exchangeRates.set(currency, rate.rate)
      } else {
        // Fallback: if no rate found, use 1 (will only match same-currency transfers)
        console.warn(`No exchange rate found for ${currency} to USD, using 1:1`)
        exchangeRates.set(currency, 1)
      }
    }
  }

  // Enrich transactions with account info and USD-converted amounts
  const transactions: TransactionWithAccount[] = rawTransactions.map(tx => {
    const account = accountMap.get(tx.accountId)
    const amount = Number(tx.amount)
    const currency = tx.currency || 'USD'
    const rate = exchangeRates.get(currency) || 1
    const amountUSD = amount * rate

    return {
      id: tx.id,
      accountId: tx.accountId,
      accountName: account?.name || 'Unknown',
      accountType: account?.accountType || 'UNKNOWN',
      amount,
      amountUSD,
      currency,
      date: tx.date,
      category: tx.category,
      type: tx.type,
    }
  })

  // Match internal transfers
  const matchedTransfers = matchInternalTransfers(transactions)
  const matchedTxIds = new Set<string>()

  // Create a set of all matched transaction IDs
  // We need to find the actual transaction IDs that were matched
  for (const transfer of matchedTransfers) {
    // Find the outgoing transaction that matches this transfer (by original amount and date)
    const outgoing = transactions.find(tx =>
      tx.accountId === transfer.fromAccount &&
      Math.abs(tx.amount) === transfer.amount &&
      tx.date.getTime() === transfer.date.getTime()
    )
    if (outgoing) matchedTxIds.add(outgoing.id)

    // Find corresponding incoming (within tolerance using USD amounts for cross-currency matching)
    const incoming = transactions.find(tx =>
      tx.accountId === transfer.toAccount &&
      tx.amount > 0 &&
      Math.abs(tx.amountUSD - transfer.amountUSD) <= Math.max(transfer.amountUSD * 0.02, 50) &&
      Math.abs(tx.date.getTime() - transfer.date.getTime()) <= 3 * 24 * 60 * 60 * 1000
    )
    if (incoming) matchedTxIds.add(incoming.id)
  }

  // Calculate investment contributions (transfers to brokerage accounts) - use USD for consistency
  let investmentContributions = 0
  for (const transfer of matchedTransfers) {
    const toAccount = accountMap.get(transfer.toAccount)
    if (toAccount && isBrokerageAccount(toAccount.accountType)) {
      investmentContributions += transfer.amountUSD
    }
  }

  // Create internal transfer summary (grouped by from/to account pairs) - use USD for consistency
  const transferSummaryMap = new Map<string, InternalTransferSummary>()
  for (const transfer of matchedTransfers) {
    const key = `${transfer.fromAccountName}→${transfer.toAccountName}`
    const existing = transferSummaryMap.get(key) || {
      fromAccountName: transfer.fromAccountName,
      toAccountName: transfer.toAccountName,
      totalAmount: 0,
      count: 0,
    }
    existing.totalAmount += transfer.amountUSD
    existing.count += 1
    transferSummaryMap.set(key, existing)
  }
  const internalTransferSummary = Array.from(transferSummaryMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)

  // Aggregate by category, separating matched transfers
  const categoryMap = new Map<string, { amount: number; count: number }>()
  const trueCategoryMap = new Map<string, { amount: number; count: number }>()

  for (const tx of transactions) {
    if (!tx.category) continue

    // Original totals (include everything)
    const existing = categoryMap.get(tx.category) || { amount: 0, count: 0 }
    categoryMap.set(tx.category, {
      amount: existing.amount + tx.amount,
      count: existing.count + 1,
    })

    // True totals (exclude matched transfers AND investment transaction types)
    // Investment types like BUY, SELL, DEPOSIT, WITHDRAWAL are just moving assets, not real income/expenses
    const isInvestmentType = INVESTMENT_TYPES.includes(tx.type)
    if (!matchedTxIds.has(tx.id) && !isInvestmentType) {
      const trueExisting = trueCategoryMap.get(tx.category) || { amount: 0, count: 0 }
      trueCategoryMap.set(tx.category, {
        amount: trueExisting.amount + tx.amount,
        count: trueExisting.count + 1,
      })
    }
  }

  // Separate income and expenses (original logic for backward compatibility)
  const incomeByCategory: CategorySummary[] = []
  const expensesByCategory: CategorySummary[] = []
  let totalIncome = 0
  let totalExpenses = 0

  for (const [category, data] of categoryMap.entries()) {
    const summary: CategorySummary = {
      category,
      amount: data.amount,
      count: data.count,
    }

    if (INCOME_CATEGORIES.includes(category) || data.amount > 0) {
      incomeByCategory.push(summary)
      totalIncome += data.amount
    } else {
      expensesByCategory.push(summary)
      totalExpenses += data.amount
    }
  }

  // Calculate true income and expenses (excluding matched transfers)
  let trueIncome = 0
  let trueExpenses = 0

  for (const [category, data] of trueCategoryMap.entries()) {
    // Skip transfer categories entirely - they're not real income or expenses
    if (TRANSFER_CATEGORIES.includes(category)) {
      continue
    }

    if (INCOME_CATEGORIES.includes(category)) {
      // Explicitly defined income categories
      trueIncome += data.amount
    } else if (data.amount > 0) {
      // Positive amounts in non-transfer categories (could be refunds, etc.)
      // Only count as income if it's a recognized income pattern
      trueIncome += data.amount
    } else {
      // Negative amounts = expenses
      trueExpenses += data.amount
    }
  }

  // Calculate true savings rate
  const trueSavingsRate = trueIncome > 0
    ? ((trueIncome + trueExpenses) / trueIncome) * 100
    : null

  return {
    // Original fields
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome + totalExpenses,
    incomeByCategory,
    expensesByCategory,

    // Enhanced fields
    trueIncome,
    trueExpenses,
    investmentContributions,
    internalTransfers: matchedTransfers,
    internalTransferSummary,
    trueSavingsRate,
  }
}
