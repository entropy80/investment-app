/**
 * Tax Lot Service
 *
 * Implements FIFO (First-In-First-Out) tax lot tracking for securities.
 * Tax lots are created when shares are purchased (BUY) and consumed when sold (SELL).
 */

import { prisma } from "@/lib/prisma"
import { Prisma, TaxLot, PortfolioTransaction } from "@prisma/client"
import Decimal from "decimal.js"

// ============================================================================
// Types
// ============================================================================

export interface TaxLotConsumption {
  taxLotId: string
  quantityUsed: Decimal
  costBasis: Decimal
  acquiredAt: Date
  daysHeld: number
}

export interface RealizedGainResult {
  proceeds: Decimal
  costBasis: Decimal
  realizedGainLoss: Decimal
  averageDaysHeld: number
  consumptions: TaxLotConsumption[]
}

// ============================================================================
// Tax Lot Creation (BUY transactions)
// ============================================================================

/**
 * Create a tax lot for a BUY transaction
 */
export async function createTaxLot(
  transaction: PortfolioTransaction
): Promise<TaxLot | null> {
  // Only create tax lots for BUY and REINVEST_DIVIDEND transactions
  if (transaction.type !== "BUY" && transaction.type !== "REINVEST_DIVIDEND") {
    return null
  }

  if (!transaction.holdingId || !transaction.quantity || !transaction.price) {
    console.warn(`Cannot create tax lot for transaction ${transaction.id}: missing required fields`)
    return null
  }

  const quantity = new Decimal(transaction.quantity.toString())
  const price = new Decimal(transaction.price.toString())
  const fees = transaction.fees ? new Decimal(transaction.fees.toString()) : new Decimal(0)

  // Cost basis includes fees
  const costBasis = quantity.times(price).plus(fees)
  const costPerUnit = costBasis.dividedBy(quantity)

  // Check if tax lot already exists for this transaction
  const existing = await prisma.taxLot.findFirst({
    where: { transactionId: transaction.id }
  })

  if (existing) {
    return existing
  }

  const taxLot = await prisma.taxLot.create({
    data: {
      holdingId: transaction.holdingId,
      transactionId: transaction.id,
      quantity: quantity.toDecimalPlaces(8),
      remaining: quantity.toDecimalPlaces(8),
      costBasis: costBasis.toDecimalPlaces(2),
      costPerUnit: costPerUnit.toDecimalPlaces(8),
      acquiredAt: transaction.date,
    }
  })

  return taxLot
}

// ============================================================================
// Tax Lot Consumption (SELL transactions) - FIFO
// ============================================================================

/**
 * Consume tax lots for a SELL transaction using FIFO method
 * Returns the realized gain/loss calculation
 */
export async function consumeTaxLots(
  transaction: PortfolioTransaction
): Promise<RealizedGainResult | null> {
  if (transaction.type !== "SELL") {
    return null
  }

  if (!transaction.holdingId || !transaction.quantity || !transaction.price) {
    console.warn(`Cannot consume tax lots for transaction ${transaction.id}: missing required fields`)
    return null
  }

  const sellQuantity = new Decimal(transaction.quantity.toString())
  const sellPrice = new Decimal(transaction.price.toString())
  const fees = transaction.fees ? new Decimal(transaction.fees.toString()) : new Decimal(0)

  // Proceeds = sale amount minus fees
  const proceeds = sellQuantity.times(sellPrice).minus(fees)

  // Get available tax lots for this holding, ordered by acquisition date (FIFO)
  const taxLots = await prisma.taxLot.findMany({
    where: {
      holdingId: transaction.holdingId,
      remaining: { gt: 0 }
    },
    orderBy: { acquiredAt: "asc" }
  })

  if (taxLots.length === 0) {
    console.warn(`No tax lots available for holding ${transaction.holdingId}`)
    return null
  }

  let remainingToSell = sellQuantity
  let totalCostBasis = new Decimal(0)
  let totalDaysHeld = new Decimal(0)
  const consumptions: TaxLotConsumption[] = []

  const sellDate = transaction.date

  for (const lot of taxLots) {
    if (remainingToSell.lte(0)) break

    const lotRemaining = new Decimal(lot.remaining.toString())
    const lotCostPerUnit = new Decimal(lot.costPerUnit.toString())

    // How much to take from this lot
    const quantityToUse = Decimal.min(lotRemaining, remainingToSell)
    const costBasisUsed = quantityToUse.times(lotCostPerUnit)

    // Calculate days held
    const daysHeld = Math.floor(
      (sellDate.getTime() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    consumptions.push({
      taxLotId: lot.id,
      quantityUsed: quantityToUse,
      costBasis: costBasisUsed,
      acquiredAt: lot.acquiredAt,
      daysHeld,
    })

    totalCostBasis = totalCostBasis.plus(costBasisUsed)
    totalDaysHeld = totalDaysHeld.plus(quantityToUse.times(daysHeld))

    // Update the tax lot's remaining quantity
    const newRemaining = lotRemaining.minus(quantityToUse)
    await prisma.taxLot.update({
      where: { id: lot.id },
      data: { remaining: newRemaining.toDecimalPlaces(8) }
    })

    remainingToSell = remainingToSell.minus(quantityToUse)
  }

  if (remainingToSell.gt(0)) {
    console.warn(
      `Insufficient tax lots for transaction ${transaction.id}: ` +
      `${remainingToSell.toString()} shares could not be matched`
    )
  }

  const realizedGainLoss = proceeds.minus(totalCostBasis)
  const averageDaysHeld = sellQuantity.gt(0)
    ? Math.round(totalDaysHeld.dividedBy(sellQuantity).toNumber())
    : 0

  // Update the transaction with realized gain info
  await prisma.portfolioTransaction.update({
    where: { id: transaction.id },
    data: {
      costBasisUsed: totalCostBasis.toDecimalPlaces(2),
      realizedGainLoss: realizedGainLoss.toDecimalPlaces(2),
      holdingPeriodDays: averageDaysHeld,
    }
  })

  return {
    proceeds,
    costBasis: totalCostBasis,
    realizedGainLoss,
    averageDaysHeld,
    consumptions,
  }
}

// ============================================================================
// Process Transaction (unified entry point)
// ============================================================================

/**
 * Process a transaction for tax lot tracking
 * - BUY/REINVEST_DIVIDEND: Creates a tax lot
 * - SELL: Consumes tax lots using FIFO
 */
export async function processTransactionForTaxLots(
  transaction: PortfolioTransaction
): Promise<{ taxLot?: TaxLot; realizedGain?: RealizedGainResult }> {
  if (transaction.type === "BUY" || transaction.type === "REINVEST_DIVIDEND") {
    const taxLot = await createTaxLot(transaction)
    return { taxLot: taxLot || undefined }
  }

  if (transaction.type === "SELL") {
    const realizedGain = await consumeTaxLots(transaction)
    return { realizedGain: realizedGain || undefined }
  }

  return {}
}

// ============================================================================
// Backfill Tax Lots for Existing Transactions
// ============================================================================

/**
 * Backfill tax lots for all existing transactions in a portfolio
 * Processes transactions in chronological order
 */
export async function backfillTaxLotsForPortfolio(
  portfolioId: string,
  userId: string
): Promise<{ created: number; consumed: number; errors: string[] }> {
  // Verify portfolio ownership
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: { accounts: { select: { id: true } } }
  })

  if (!portfolio) {
    throw new Error("Portfolio not found or access denied")
  }

  const accountIds = portfolio.accounts.map(a => a.id)

  // Get all BUY, REINVEST_DIVIDEND, and SELL transactions in chronological order
  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: { in: ["BUY", "REINVEST_DIVIDEND", "SELL"] },
      holdingId: { not: null },
    },
    orderBy: { date: "asc" }
  })

  let created = 0
  let consumed = 0
  const errors: string[] = []

  for (const tx of transactions) {
    try {
      const result = await processTransactionForTaxLots(tx)
      if (result.taxLot) created++
      if (result.realizedGain) consumed++
    } catch (error: any) {
      errors.push(`Transaction ${tx.id}: ${error.message}`)
    }
  }

  return { created, consumed, errors }
}

// ============================================================================
// Tax Lot Queries
// ============================================================================

/**
 * Get all tax lots for a holding
 */
export async function getTaxLotsForHolding(
  holdingId: string
): Promise<TaxLot[]> {
  return prisma.taxLot.findMany({
    where: { holdingId },
    orderBy: { acquiredAt: "asc" }
  })
}

/**
 * Get summary of realized gains for a portfolio
 */
export async function getPortfolioRealizedGains(
  portfolioId: string,
  userId: string,
  options?: {
    year?: number
    startDate?: Date
    endDate?: Date
  }
): Promise<{
  totalRealizedGain: number
  shortTermGain: number
  longTermGain: number
  transactions: PortfolioTransaction[]
}> {
  // Verify portfolio ownership
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: { accounts: { select: { id: true } } }
  })

  if (!portfolio) {
    throw new Error("Portfolio not found or access denied")
  }

  const accountIds = portfolio.accounts.map(a => a.id)

  // Build date filter
  let dateFilter: Prisma.PortfolioTransactionWhereInput = {}
  if (options?.year) {
    dateFilter.date = {
      gte: new Date(options.year, 0, 1),
      lt: new Date(options.year + 1, 0, 1),
    }
  } else if (options?.startDate || options?.endDate) {
    dateFilter.date = {}
    if (options.startDate) dateFilter.date.gte = options.startDate
    if (options.endDate) dateFilter.date.lte = options.endDate
  }

  // Get SELL transactions with realized gains
  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: "SELL",
      realizedGainLoss: { not: null },
      ...dateFilter,
    },
    orderBy: { date: "desc" }
  })

  let totalRealizedGain = 0
  let shortTermGain = 0
  let longTermGain = 0

  for (const tx of transactions) {
    const gain = Number(tx.realizedGainLoss)
    totalRealizedGain += gain

    // Short-term: held less than 1 year (365 days)
    // Long-term: held 1 year or more
    if (tx.holdingPeriodDays !== null && tx.holdingPeriodDays < 365) {
      shortTermGain += gain
    } else {
      longTermGain += gain
    }
  }

  return {
    totalRealizedGain,
    shortTermGain,
    longTermGain,
    transactions,
  }
}
