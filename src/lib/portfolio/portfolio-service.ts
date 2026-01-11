import { prisma } from '@/lib/prisma'
import {
  Portfolio,
  FinancialAccount,
  Holding,
  PortfolioTransaction,
  PriceSnapshot,
  AccountType,
  AssetType,
  PortfolioTransactionType,
  Prisma,
} from '@prisma/client'
import Decimal from 'decimal.js'

// ============================================================================
// Type Definitions
// ============================================================================

export type PortfolioWithAccounts = Portfolio & {
  accounts: FinancialAccountWithHoldings[]
}

export type FinancialAccountWithHoldings = FinancialAccount & {
  holdings: HoldingWithPrice[]
  _count?: { transactions: number }
}

export type HoldingWithPrice = Holding & {
  latestPrice?: PriceSnapshot | null
  currentValue?: number
  gainLoss?: number
  gainLossPercent?: number
}

export type PortfolioSummary = {
  totalValue: number
  totalCostBasis: number
  totalGainLoss: number
  totalGainLossPercent: number
  accountCount: number
  holdingCount: number
  assetAllocation: { assetType: AssetType; value: number; percentage: number }[]
  // Currency conversion (when baseCurrency differs from USD)
  baseCurrency: string
  converted?: {
    totalValue: number
    totalCostBasis: number
    totalGainLoss: number
    exchangeRate: number
    rateDate: Date
    assetAllocation: { assetType: AssetType; value: number; percentage: number }[]
  }
}

// ============================================================================
// Portfolio CRUD Operations
// ============================================================================

export type CreatePortfolioInput = {
  userId: string
  name: string
  description?: string
  isDefault?: boolean
  baseCurrency?: string
}

export type UpdatePortfolioInput = Partial<Omit<CreatePortfolioInput, 'userId'>>

export async function createPortfolio(data: CreatePortfolioInput): Promise<Portfolio> {
  // If this is the first portfolio or marked as default, ensure only one default
  if (data.isDefault) {
    await prisma.portfolio.updateMany({
      where: { userId: data.userId },
      data: { isDefault: false },
    })
  }

  // Check if this is the first portfolio for the user
  const existingCount = await prisma.portfolio.count({
    where: { userId: data.userId },
  })

  return prisma.portfolio.create({
    data: {
      ...data,
      isDefault: existingCount === 0 ? true : data.isDefault || false,
    },
  })
}

export async function updatePortfolio(
  id: string,
  userId: string,
  data: UpdatePortfolioInput
): Promise<Portfolio> {
  // If setting as default, unset other defaults
  if (data.isDefault) {
    await prisma.portfolio.updateMany({
      where: { userId, id: { not: id } },
      data: { isDefault: false },
    })
  }

  return prisma.portfolio.update({
    where: { id, userId },
    data,
  })
}

export async function deletePortfolio(id: string, userId: string): Promise<Portfolio> {
  return prisma.portfolio.delete({
    where: { id, userId },
  })
}

export async function getPortfolioById(
  id: string,
  userId: string
): Promise<PortfolioWithAccounts | null> {
  return prisma.portfolio.findFirst({
    where: { id, userId },
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
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  }) as Promise<PortfolioWithAccounts | null>
}

export async function getUserPortfolios(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ portfolios: Portfolio[]; total: number }> {
  const [portfolios, total] = await Promise.all([
    prisma.portfolio.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.portfolio.count({ where: { userId } }),
  ])

  return { portfolios, total }
}

export async function getDefaultPortfolio(userId: string): Promise<Portfolio | null> {
  return prisma.portfolio.findFirst({
    where: { userId, isDefault: true },
  })
}

// ============================================================================
// Financial Account CRUD Operations
// ============================================================================

export type CreateFinancialAccountInput = {
  portfolioId: string
  name: string
  institution: string
  accountType: AccountType
  currency?: string
  notes?: string
}

export type UpdateFinancialAccountInput = Partial<Omit<CreateFinancialAccountInput, 'portfolioId'>> & {
  isActive?: boolean
}

export async function createFinancialAccount(
  data: CreateFinancialAccountInput,
  userId: string
): Promise<FinancialAccount> {
  // Verify the portfolio belongs to the user
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: data.portfolioId, userId },
  })

  if (!portfolio) {
    throw new Error('Portfolio not found or access denied')
  }

  return prisma.financialAccount.create({
    data,
  })
}

export async function updateFinancialAccount(
  id: string,
  userId: string,
  data: UpdateFinancialAccountInput
): Promise<FinancialAccount> {
  // Verify ownership through portfolio
  const account = await prisma.financialAccount.findFirst({
    where: { id },
    include: { portfolio: { select: { userId: true } } },
  })

  if (!account || account.portfolio.userId !== userId) {
    throw new Error('Account not found or access denied')
  }

  return prisma.financialAccount.update({
    where: { id },
    data,
  })
}

export async function deleteFinancialAccount(
  id: string,
  userId: string
): Promise<FinancialAccount> {
  // Verify ownership through portfolio
  const account = await prisma.financialAccount.findFirst({
    where: { id },
    include: { portfolio: { select: { userId: true } } },
  })

  if (!account || account.portfolio.userId !== userId) {
    throw new Error('Account not found or access denied')
  }

  return prisma.financialAccount.delete({
    where: { id },
  })
}

export async function getFinancialAccountById(
  id: string,
  userId: string
): Promise<FinancialAccountWithHoldings | null> {
  const account = await prisma.financialAccount.findFirst({
    where: { id },
    include: {
      portfolio: { select: { userId: true } },
      holdings: {
        include: {
          priceHistory: {
            orderBy: { snapshotAt: 'desc' },
            take: 1,
          },
        },
      },
      _count: { select: { transactions: true } },
    },
  })

  if (!account || account.portfolio.userId !== userId) {
    return null
  }

  // Remove portfolio from return type
  const { portfolio: _, ...accountData } = account
  return accountData as FinancialAccountWithHoldings
}

// ============================================================================
// Holding CRUD Operations
// ============================================================================

export type CreateHoldingInput = {
  accountId: string
  symbol: string
  name: string
  assetType: AssetType
  quantity: number
  costBasis?: number
  avgCostPerUnit?: number
  currency?: string
  notes?: string
}

export type UpdateHoldingInput = Partial<Omit<CreateHoldingInput, 'accountId' | 'symbol'>>

export async function createHolding(
  data: CreateHoldingInput,
  userId: string
): Promise<Holding> {
  // Verify ownership through account -> portfolio
  const account = await prisma.financialAccount.findFirst({
    where: { id: data.accountId },
    include: { portfolio: { select: { userId: true } } },
  })

  if (!account || account.portfolio.userId !== userId) {
    throw new Error('Account not found or access denied')
  }

  return prisma.holding.create({
    data: {
      ...data,
      quantity: new Prisma.Decimal(data.quantity),
      costBasis: data.costBasis ? new Prisma.Decimal(data.costBasis) : null,
      avgCostPerUnit: data.avgCostPerUnit ? new Prisma.Decimal(data.avgCostPerUnit) : null,
    },
  })
}

export async function updateHolding(
  id: string,
  userId: string,
  data: UpdateHoldingInput
): Promise<Holding> {
  // Verify ownership
  const holding = await prisma.holding.findFirst({
    where: { id },
    include: {
      account: {
        include: { portfolio: { select: { userId: true } } },
      },
    },
  })

  if (!holding || holding.account.portfolio.userId !== userId) {
    throw new Error('Holding not found or access denied')
  }

  const updateData: Prisma.HoldingUpdateInput = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.assetType !== undefined) updateData.assetType = data.assetType
  if (data.quantity !== undefined) updateData.quantity = new Prisma.Decimal(data.quantity)
  if (data.costBasis !== undefined) updateData.costBasis = data.costBasis ? new Prisma.Decimal(data.costBasis) : null
  if (data.avgCostPerUnit !== undefined) updateData.avgCostPerUnit = data.avgCostPerUnit ? new Prisma.Decimal(data.avgCostPerUnit) : null
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.notes !== undefined) updateData.notes = data.notes

  return prisma.holding.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteHolding(id: string, userId: string): Promise<Holding> {
  // Verify ownership
  const holding = await prisma.holding.findFirst({
    where: { id },
    include: {
      account: {
        include: { portfolio: { select: { userId: true } } },
      },
    },
  })

  if (!holding || holding.account.portfolio.userId !== userId) {
    throw new Error('Holding not found or access denied')
  }

  return prisma.holding.delete({
    where: { id },
  })
}

export async function getHoldingById(
  id: string,
  userId: string
): Promise<HoldingWithPrice | null> {
  const holding = await prisma.holding.findFirst({
    where: { id },
    include: {
      account: {
        include: { portfolio: { select: { userId: true } } },
      },
      priceHistory: {
        orderBy: { snapshotAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!holding || holding.account.portfolio.userId !== userId) {
    return null
  }

  const { account: _, priceHistory, ...holdingData } = holding
  return {
    ...holdingData,
    latestPrice: priceHistory[0] || null,
    priceHistory,
  } as HoldingWithPrice
}

// ============================================================================
// Transaction CRUD Operations
// ============================================================================

export type CreateTransactionInput = {
  accountId: string
  holdingId?: string
  type: PortfolioTransactionType
  symbol?: string
  quantity?: number
  price?: number
  amount: number
  fees?: number
  currency?: string
  date: Date
  notes?: string
}

export type UpdateTransactionInput = Partial<Omit<CreateTransactionInput, 'accountId'>>

export async function createTransaction(
  data: CreateTransactionInput,
  userId: string
): Promise<PortfolioTransaction> {
  // Verify ownership through account -> portfolio
  const account = await prisma.financialAccount.findFirst({
    where: { id: data.accountId },
    include: { portfolio: { select: { userId: true } } },
  })

  if (!account || account.portfolio.userId !== userId) {
    throw new Error('Account not found or access denied')
  }

  return prisma.portfolioTransaction.create({
    data: {
      ...data,
      quantity: data.quantity ? new Prisma.Decimal(data.quantity) : null,
      price: data.price ? new Prisma.Decimal(data.price) : null,
      amount: new Prisma.Decimal(data.amount),
      fees: data.fees ? new Prisma.Decimal(data.fees) : null,
    },
  })
}

export type TransactionWithAccount = PortfolioTransaction & {
  account?: {
    id: string
    name: string
    institution: string
  }
}

export async function getTransactions(
  userId: string,
  options?: {
    portfolioId?: string
    accountId?: string
    holdingId?: string
    type?: PortfolioTransactionType
    types?: PortfolioTransactionType[]
    symbol?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
    includeAccount?: boolean
    hasFees?: boolean
    category?: string
  }
): Promise<{ transactions: TransactionWithAccount[]; total: number }> {
  // Build the where clause
  const where: Prisma.PortfolioTransactionWhereInput = {
    account: {
      portfolio: { userId },
    },
  }

  if (options?.portfolioId) {
    where.account = {
      ...where.account as object,
      portfolioId: options.portfolioId,
    }
  }

  if (options?.accountId) {
    where.accountId = options.accountId
  }

  if (options?.holdingId) {
    where.holdingId = options.holdingId
  }

  // Support single type or multiple types
  if (options?.types && options.types.length > 0) {
    where.type = { in: options.types }
  } else if (options?.type) {
    where.type = options.type
  }

  // Symbol filter (case-insensitive partial match)
  if (options?.symbol) {
    where.symbol = {
      contains: options.symbol.toUpperCase(),
      mode: 'insensitive',
    }
  }

  if (options?.startDate || options?.endDate) {
    where.date = {}
    if (options?.startDate) {
      where.date.gte = options.startDate
    }
    if (options?.endDate) {
      where.date.lte = options.endDate
    }
  }

  // Filter for transactions with fees
  if (options?.hasFees) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { fees: { not: null } },
      { NOT: { fees: 0 } },
    ]
  }

  // Filter by category (for bank transactions)
  if (options?.category) {
    where.category = options.category as any
  }

  const [transactions, total] = await Promise.all([
    prisma.portfolioTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: options?.limit,
      skip: options?.offset,
      include: options?.includeAccount ? {
        account: {
          select: {
            id: true,
            name: true,
            institution: true,
          },
        },
      } : undefined,
    }),
    prisma.portfolioTransaction.count({ where }),
  ])

  return { transactions, total }
}

export async function deleteTransaction(
  id: string,
  userId: string
): Promise<PortfolioTransaction> {
  // Verify ownership
  const transaction = await prisma.portfolioTransaction.findFirst({
    where: { id },
    include: {
      account: {
        include: { portfolio: { select: { userId: true } } },
      },
    },
  })

  if (!transaction || transaction.account.portfolio.userId !== userId) {
    throw new Error('Transaction not found or access denied')
  }

  return prisma.portfolioTransaction.delete({
    where: { id },
  })
}

// ============================================================================
// Price Snapshot Operations
// ============================================================================

export async function createPriceSnapshot(
  holdingId: string,
  price: number,
  currency: string = 'USD',
  source?: string
): Promise<PriceSnapshot> {
  return prisma.priceSnapshot.create({
    data: {
      holdingId,
      price: new Prisma.Decimal(price),
      currency,
      source,
      snapshotAt: new Date(),
    },
  })
}

export async function getLatestPrice(holdingId: string): Promise<PriceSnapshot | null> {
  return prisma.priceSnapshot.findFirst({
    where: { holdingId },
    orderBy: { snapshotAt: 'desc' },
  })
}

export async function getPriceHistory(
  holdingId: string,
  options?: {
    startDate?: Date
    endDate?: Date
    limit?: number
  }
): Promise<PriceSnapshot[]> {
  const where: Prisma.PriceSnapshotWhereInput = { holdingId }

  if (options?.startDate || options?.endDate) {
    where.snapshotAt = {}
    if (options?.startDate) {
      where.snapshotAt.gte = options.startDate
    }
    if (options?.endDate) {
      where.snapshotAt.lte = options.endDate
    }
  }

  return prisma.priceSnapshot.findMany({
    where,
    orderBy: { snapshotAt: 'desc' },
    take: options?.limit,
  })
}

// ============================================================================
// Portfolio Analytics & Summary
// ============================================================================

export async function getPortfolioSummary(
  portfolioId: string,
  userId: string
): Promise<PortfolioSummary | null> {
  const portfolio = await getPortfolioById(portfolioId, userId)

  if (!portfolio) {
    return null
  }

  // Import currency service for cash conversion
  const { getExchangeRate } = await import('@/lib/currency')

  // Cache exchange rates to avoid multiple lookups
  const exchangeRateCache = new Map<string, number>()
  const getRate = async (currency: string): Promise<number> => {
    if (currency === 'USD') return 1
    if (exchangeRateCache.has(currency)) return exchangeRateCache.get(currency)!

    const rate = await getExchangeRate(currency, 'USD')
    const rateValue = rate?.rate || 1
    exchangeRateCache.set(currency, rateValue)
    return rateValue
  }

  let totalValue = 0
  let totalCostBasis = 0
  let holdingCount = 0
  const assetAllocationMap = new Map<AssetType, number>()

  for (const account of portfolio.accounts) {
    for (const holding of account.holdings) {
      const quantity = Number(holding.quantity)
      const costBasis = holding.costBasis ? Number(holding.costBasis) : 0
      const isCash = holding.symbol.startsWith('CASH.')

      // Only count active positions (quantity > 0)
      if (quantity > 0) {
        holdingCount++
      }

      // Get latest price from priceHistory array
      const priceSnapshot = (holding as any).priceHistory?.[0]
      const hasPriceFromAPI = priceSnapshot?.price != null
      const holdingCurrency = holding.currency || account.currency || 'USD'

      // Skip closed positions (quantity = 0) from calculations
      if (quantity === 0) {
        continue
      }

      // Calculate current value
      let currentValue: number
      if (isCash) {
        // Cash holdings: extract currency from symbol (e.g., CASH.KWD -> KWD)
        const cashCurrency = holding.symbol.split('.')[1] || 'USD'
        const rateToUSD = await getRate(cashCurrency)
        currentValue = quantity * rateToUSD
      } else if (hasPriceFromAPI) {
        // Securities with API price: prices are already in USD
        currentValue = quantity * Number(priceSnapshot.price)
      } else {
        // Non-priceable assets (REAL_ESTATE, OTHER, COMMODITY) or no API price:
        // avgCostPerUnit is stored in the holding's currency, needs conversion to USD
        const fallbackPrice = holding.avgCostPerUnit ? Number(holding.avgCostPerUnit) : 0
        const valueInHoldingCurrency = quantity * fallbackPrice
        const rateToUSD = await getRate(holdingCurrency)
        currentValue = valueInHoldingCurrency * rateToUSD
      }
      totalValue += currentValue

      // Only include securities in cost basis (not cash)
      // Cost basis is stored in holding's currency, needs conversion to USD
      if (!isCash && costBasis > 0) {
        const rateToUSD = await getRate(holdingCurrency)
        totalCostBasis += costBasis * rateToUSD
      }

      // Track asset allocation (in USD)
      const existing = assetAllocationMap.get(holding.assetType) || 0
      assetAllocationMap.set(holding.assetType, existing + currentValue)
    }
  }

  // Calculate gain/loss based on securities only (totalValue includes cash, so subtract it for accurate gain/loss)
  const securitiesValue = totalValue - Array.from(assetAllocationMap.entries())
    .filter(([type]) => type === 'CASH')
    .reduce((sum, [, value]) => sum + value, 0)

  const totalGainLoss = securitiesValue - totalCostBasis
  const totalGainLossPercent = totalCostBasis > 0
    ? (totalGainLoss / totalCostBasis) * 100
    : 0

  // Convert asset allocation map to array with percentages
  const assetAllocation = Array.from(assetAllocationMap.entries()).map(([assetType, value]) => ({
    assetType,
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
  })).sort((a, b) => b.value - a.value)

  const baseCurrency = portfolio.baseCurrency || 'USD'

  // Build summary
  const summary: PortfolioSummary = {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    accountCount: portfolio.accounts.length,
    holdingCount,
    assetAllocation,
    baseCurrency,
  }

  // Add currency conversion if base currency is not USD
  if (baseCurrency !== 'USD') {
    // Import dynamically to avoid circular dependency
    const { getExchangeRate } = await import('@/lib/currency')
    const rate = await getExchangeRate('USD', baseCurrency)

    if (rate) {
      // Convert asset allocation values
      const convertedAssetAllocation = assetAllocation.map(item => ({
        assetType: item.assetType,
        value: item.value * rate.rate,
        percentage: item.percentage, // Percentage stays the same
      }))

      summary.converted = {
        totalValue: totalValue * rate.rate,
        totalCostBasis: totalCostBasis * rate.rate,
        totalGainLoss: totalGainLoss * rate.rate,
        exchangeRate: rate.rate,
        rateDate: rate.effectiveDate,
        assetAllocation: convertedAssetAllocation,
      }
    }
  }

  return summary
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    BROKERAGE: 'Brokerage',
    BANK: 'Bank Account',
    CRYPTO_EXCHANGE: 'Crypto Exchange',
    RETIREMENT: 'Retirement Account',
    REAL_ESTATE: 'Real Estate',
    OTHER: 'Other',
  }
  return labels[type]
}

export function getAssetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    STOCK: 'Stock',
    ETF: 'ETF',
    MUTUAL_FUND: 'Mutual Fund',
    BOND: 'Bond',
    CRYPTO: 'Cryptocurrency',
    CASH: 'Cash',
    REAL_ESTATE: 'Real Estate',
    COMMODITY: 'Commodity',
    OTHER: 'Other',
  }
  return labels[type]
}

export function getTransactionTypeLabel(type: PortfolioTransactionType): string {
  const labels: Record<PortfolioTransactionType, string> = {
    BUY: 'Buy',
    SELL: 'Sell',
    DIVIDEND: 'Dividend',
    REINVEST_DIVIDEND: 'Dividend Reinvestment',
    INTEREST: 'Interest',
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    TRANSFER_IN: 'Transfer In',
    TRANSFER_OUT: 'Transfer Out',
    FEE: 'Fee',
    SPLIT: 'Stock Split',
    TAX_WITHHOLDING: 'Tax Withholding',
    FOREX: 'Forex',
    ADJUSTMENT: 'Adjustment',
    OTHER: 'Other',
  }
  return labels[type]
}

// ============================================================================
// Holdings Recalculation
// ============================================================================

/**
 * Recalculate a single holding's quantity and cost basis from transactions
 */
export async function recalculateHolding(holdingId: string): Promise<Holding> {
  const holding = await prisma.holding.findUnique({
    where: { id: holdingId },
    include: {
      transactions: {
        orderBy: { date: 'asc' },
      },
    },
  })

  if (!holding) {
    throw new Error(`Holding not found: ${holdingId}`)
  }

  let quantity = new Decimal(0)
  let totalCost = new Decimal(0)

  for (const tx of holding.transactions) {
    const txQty = tx.quantity ? new Decimal(tx.quantity.toString()) : new Decimal(0)
    const txPrice = tx.price ? new Decimal(tx.price.toString()) : new Decimal(0)

    switch (tx.type) {
      case 'BUY':
      case 'TRANSFER_IN':
      case 'REINVEST_DIVIDEND':
        quantity = quantity.plus(txQty)
        // Add to cost basis: quantity * price
        if (txQty.greaterThan(0) && txPrice.greaterThan(0)) {
          totalCost = totalCost.plus(txQty.times(txPrice))
        }
        break

      case 'SELL':
      case 'TRANSFER_OUT':
        // For sells, reduce cost basis proportionally (simplified - not FIFO)
        if (quantity.greaterThan(0) && txQty.greaterThan(0)) {
          const costPerUnit = totalCost.dividedBy(quantity)
          totalCost = totalCost.minus(costPerUnit.times(txQty))
        }
        quantity = quantity.minus(txQty)
        break

      // These don't affect quantity
      case 'DIVIDEND':
      case 'INTEREST':
      case 'TAX_WITHHOLDING':
      case 'FEE':
      case 'ADJUSTMENT':
      case 'FOREX':
      case 'OTHER':
        break

      case 'SPLIT':
        // Stock splits multiply quantity (ratio stored in quantity field)
        // e.g., 4:1 split means quantity = 4
        if (txQty.greaterThan(0)) {
          quantity = quantity.times(txQty)
        }
        break

      case 'DEPOSIT':
      case 'WITHDRAWAL':
        // These are cash movements, not holdings changes
        break
    }
  }

  // Ensure non-negative
  if (quantity.lessThan(0)) {
    quantity = new Decimal(0)
  }
  if (totalCost.lessThan(0)) {
    totalCost = new Decimal(0)
  }

  // Calculate average cost per unit
  const avgCostPerUnit = quantity.greaterThan(0)
    ? totalCost.dividedBy(quantity)
    : new Decimal(0)

  // Update holding
  return prisma.holding.update({
    where: { id: holdingId },
    data: {
      quantity: new Prisma.Decimal(quantity.toFixed(8)),
      costBasis: new Prisma.Decimal(totalCost.toFixed(2)),
      avgCostPerUnit: new Prisma.Decimal(avgCostPerUnit.toFixed(8)),
    },
  })
}

/**
 * Recalculate all holdings for an account
 */
export async function recalculateAccountHoldings(accountId: string): Promise<number> {
  const holdings = await prisma.holding.findMany({
    where: { accountId },
    select: { id: true },
  })

  for (const holding of holdings) {
    await recalculateHolding(holding.id)
  }

  return holdings.length
}

/**
 * Recalculate all holdings for a portfolio
 */
export async function recalculatePortfolioHoldings(
  portfolioId: string,
  userId: string
): Promise<number> {
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
    throw new Error('Portfolio not found or access denied')
  }

  let totalRecalculated = 0
  for (const account of portfolio.accounts) {
    totalRecalculated += await recalculateAccountHoldings(account.id)
  }

  return totalRecalculated
}

/**
 * Delete holdings with zero quantity and no transactions
 * Also deletes forex pair holdings (EUR.USD, etc.) which shouldn't exist
 * But preserves CASH.* holdings
 */
export async function cleanupEmptyHoldings(accountId?: string): Promise<number> {
  const where: Prisma.HoldingWhereInput = {
    AND: [
      // Don't delete cash holdings
      { NOT: { symbol: { startsWith: 'CASH.' } } },
      {
        OR: [
          // Holdings with no transactions
          { transactions: { none: {} } },
          // Forex pair symbols that shouldn't be holdings (but not CASH.*)
          {
            AND: [
              { symbol: { contains: '.' } },
              { NOT: { symbol: { startsWith: 'CASH.' } } },
            ]
          },
        ],
      },
    ],
  }

  if (accountId) {
    where.accountId = accountId
  }

  const result = await prisma.holding.deleteMany({ where })
  return result.count
}

/**
 * Calculate cash balance for an account from all transactions
 * Cash is affected by: deposits, withdrawals, buys, sells, dividends, interest, fees, taxes
 * REINVEST_DIVIDEND is excluded as the cash is immediately reinvested
 * TDA legacy transfers are excluded - these are accounting entries from TD Ameritrade migration
 */
export async function calculateCashBalance(accountId: string): Promise<{
  balance: Decimal
  currency: string
}> {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: { currency: true },
  })

  if (!account) {
    throw new Error(`Account not found: ${accountId}`)
  }

  // Get all transactions for this account
  const transactions = await prisma.portfolioTransaction.findMany({
    where: { accountId },
    select: { type: true, amount: true, notes: true },
  })

  let balance = new Decimal(0)

  for (const tx of transactions) {
    const amount = new Decimal(tx.amount.toString())

    // REINVEST_DIVIDEND doesn't affect cash - the dividend is immediately used to buy shares
    if (tx.type === 'REINVEST_DIVIDEND') {
      continue
    }

    // Exclude TDA legacy transfers - these are accounting entries from TD Ameritrade
    // to Schwab migration that have corresponding DEPOSIT entries. Including both
    // would cause double-counting issues.
    if (tx.type === 'TRANSFER_IN' && tx.notes?.includes('TDA TRAN')) {
      continue
    }

    // All other transaction types affect cash through their amount
    // BUY: negative amount (cash outflow)
    // SELL: positive amount (cash inflow)
    // DEPOSIT: positive (cash inflow)
    // WITHDRAWAL: negative (cash outflow)
    // DIVIDEND: positive (cash inflow)
    // INTEREST: positive (cash inflow)
    // TAX_WITHHOLDING: negative (cash outflow)
    // FEE: negative (cash outflow)
    // TRANSFER_IN: positive
    // TRANSFER_OUT: negative
    // FOREX: P&L adjustment
    // ADJUSTMENT: varies
    balance = balance.plus(amount)
  }

  return {
    balance,
    currency: account.currency,
  }
}

/**
 * Create or update CASH holding for an account
 */
export async function updateCashHolding(accountId: string): Promise<Holding> {
  const { balance, currency } = await calculateCashBalance(accountId)
  const symbol = `CASH.${currency}`

  // Find or create the cash holding
  let holding = await prisma.holding.findUnique({
    where: {
      accountId_symbol: {
        accountId,
        symbol,
      },
    },
  })

  if (holding) {
    // Update existing
    return prisma.holding.update({
      where: { id: holding.id },
      data: {
        quantity: new Prisma.Decimal(balance.toFixed(2)),
        costBasis: new Prisma.Decimal(balance.toFixed(2)), // For cash, cost basis = quantity
        avgCostPerUnit: new Prisma.Decimal('1'), // 1 USD = 1 USD
      },
    })
  } else {
    // Create new cash holding
    return prisma.holding.create({
      data: {
        accountId,
        symbol,
        name: `${currency} Cash`,
        assetType: 'CASH',
        quantity: new Prisma.Decimal(balance.toFixed(2)),
        costBasis: new Prisma.Decimal(balance.toFixed(2)),
        avgCostPerUnit: new Prisma.Decimal('1'),
        currency,
      },
    })
  }
}

/**
 * Recalculate all holdings AND cash balance for an account
 */
export async function recalculateAccountComplete(accountId: string): Promise<{
  holdings: number
  cashBalance: Decimal
}> {
  // First recalculate security holdings
  const holdingsCount = await recalculateAccountHoldings(accountId)

  // Then update cash holding
  const cashHolding = await updateCashHolding(accountId)

  return {
    holdings: holdingsCount + 1, // +1 for cash
    cashBalance: new Decimal(cashHolding.quantity.toString()),
  }
}
