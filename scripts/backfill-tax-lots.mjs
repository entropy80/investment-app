/**
 * Backfill tax lots for all portfolios
 * Run with: node scripts/backfill-tax-lots.mjs
 */

import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'

// Load environment
const envContent = readFileSync('.env.local', 'utf-8')
const match = envContent.match(/^DATABASE_URL="?([^"\n]+)"?$/m)
if (match) process.env.DATABASE_URL = match[1]

const prisma = new PrismaClient()

async function createTaxLot(transaction) {
  if (transaction.type !== 'BUY' && transaction.type !== 'REINVEST_DIVIDEND') {
    return null
  }

  if (!transaction.holdingId || !transaction.quantity || !transaction.price) {
    return null
  }

  const quantity = new Decimal(transaction.quantity.toString())
  const price = new Decimal(transaction.price.toString())
  const fees = transaction.fees ? new Decimal(transaction.fees.toString()) : new Decimal(0)

  const costBasis = quantity.times(price).plus(fees)
  const costPerUnit = costBasis.dividedBy(quantity)

  // Check if already exists
  const existing = await prisma.taxLot.findFirst({
    where: { transactionId: transaction.id }
  })
  if (existing) return existing

  return prisma.taxLot.create({
    data: {
      holdingId: transaction.holdingId,
      transactionId: transaction.id,
      quantity: quantity.toDecimalPlaces(8).toString(),
      remaining: quantity.toDecimalPlaces(8).toString(),
      costBasis: costBasis.toDecimalPlaces(2).toString(),
      costPerUnit: costPerUnit.toDecimalPlaces(8).toString(),
      acquiredAt: transaction.date,
    }
  })
}

async function consumeTaxLots(transaction) {
  if (transaction.type !== 'SELL') return null
  if (!transaction.holdingId || !transaction.quantity || !transaction.price) return null

  const sellQuantity = new Decimal(transaction.quantity.toString())
  const sellPrice = new Decimal(transaction.price.toString())
  const fees = transaction.fees ? new Decimal(transaction.fees.toString()) : new Decimal(0)

  const proceeds = sellQuantity.times(sellPrice).minus(fees)

  // Get tax lots FIFO
  const taxLots = await prisma.taxLot.findMany({
    where: {
      holdingId: transaction.holdingId,
      remaining: { gt: 0 }
    },
    orderBy: { acquiredAt: 'asc' }
  })

  if (taxLots.length === 0) {
    console.log(`  No tax lots for ${transaction.symbol || transaction.id}`)
    return null
  }

  let remainingToSell = sellQuantity
  let totalCostBasis = new Decimal(0)
  let totalDaysHeld = new Decimal(0)
  const sellDate = transaction.date

  for (const lot of taxLots) {
    if (remainingToSell.lte(0)) break

    const lotRemaining = new Decimal(lot.remaining.toString())
    const lotCostPerUnit = new Decimal(lot.costPerUnit.toString())

    const quantityToUse = Decimal.min(lotRemaining, remainingToSell)
    const costBasisUsed = quantityToUse.times(lotCostPerUnit)
    const daysHeld = Math.floor((sellDate.getTime() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24))

    totalCostBasis = totalCostBasis.plus(costBasisUsed)
    totalDaysHeld = totalDaysHeld.plus(quantityToUse.times(daysHeld))

    const newRemaining = lotRemaining.minus(quantityToUse)
    await prisma.taxLot.update({
      where: { id: lot.id },
      data: { remaining: newRemaining.toDecimalPlaces(8).toString() }
    })

    remainingToSell = remainingToSell.minus(quantityToUse)
  }

  const realizedGainLoss = proceeds.minus(totalCostBasis)
  const averageDaysHeld = sellQuantity.gt(0)
    ? Math.round(totalDaysHeld.dividedBy(sellQuantity).toNumber())
    : 0

  await prisma.portfolioTransaction.update({
    where: { id: transaction.id },
    data: {
      costBasisUsed: totalCostBasis.toDecimalPlaces(2).toString(),
      realizedGainLoss: realizedGainLoss.toDecimalPlaces(2).toString(),
      holdingPeriodDays: averageDaysHeld,
    }
  })

  return { realizedGainLoss, averageDaysHeld }
}

async function main() {
  console.log('Backfilling tax lots...\n')

  // Get all portfolios
  const portfolios = await prisma.portfolio.findMany({
    include: { accounts: { select: { id: true } } }
  })

  for (const portfolio of portfolios) {
    console.log(`Portfolio: ${portfolio.name}`)
    const accountIds = portfolio.accounts.map(a => a.id)

    // Get transactions in chronological order
    const transactions = await prisma.portfolioTransaction.findMany({
      where: {
        accountId: { in: accountIds },
        type: { in: ['BUY', 'REINVEST_DIVIDEND', 'SELL'] },
        holdingId: { not: null },
      },
      orderBy: { date: 'asc' }
    })

    let created = 0
    let consumed = 0

    for (const tx of transactions) {
      if (tx.type === 'BUY' || tx.type === 'REINVEST_DIVIDEND') {
        const lot = await createTaxLot(tx)
        if (lot) created++
      } else if (tx.type === 'SELL') {
        const result = await consumeTaxLots(tx)
        if (result) {
          consumed++
          console.log(`  SELL ${tx.symbol}: Gain/Loss $${result.realizedGainLoss.toFixed(2)}, ${result.averageDaysHeld} days held`)
        }
      }
    }

    console.log(`  Created: ${created} tax lots, Processed: ${consumed} sells\n`)
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
