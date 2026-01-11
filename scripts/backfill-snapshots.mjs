#!/usr/bin/env node

/**
 * Backfill Portfolio Snapshots
 *
 * This script generates historical portfolio snapshots from transaction data.
 * It calculates portfolio value at the end of each day that had transactions.
 *
 * Usage:
 *   node scripts/backfill-snapshots.mjs <portfolio-id>
 *   node scripts/backfill-snapshots.mjs <portfolio-id> --clear  # Clear and regenerate
 */

import { PrismaClient } from "@prisma/client"
import Decimal from "decimal.js"

const prisma = new PrismaClient()

async function main() {
  const portfolioId = process.argv[2]
  const clearFlag = process.argv.includes("--clear")

  if (!portfolioId) {
    console.log("Usage: node scripts/backfill-snapshots.mjs <portfolio-id> [--clear]")
    console.log("")
    console.log("Options:")
    console.log("  --clear    Clear existing snapshots before generating new ones")
    process.exit(1)
  }

  console.log(`\nBackfilling snapshots for portfolio: ${portfolioId}`)

  // Get portfolio
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      accounts: {
        include: {
          holdings: true,
        },
      },
    },
  })

  if (!portfolio) {
    console.error("Portfolio not found")
    process.exit(1)
  }

  console.log(`Portfolio: ${portfolio.name}`)

  // Clear existing snapshots if requested
  if (clearFlag) {
    const deleted = await prisma.portfolioSnapshot.deleteMany({
      where: { portfolioId },
    })
    console.log(`Cleared ${deleted.count} existing snapshots`)
  }

  const accountIds = portfolio.accounts.map((a) => a.id)

  // Get all transactions ordered by date
  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
    },
    orderBy: { date: "asc" },
    include: {
      holding: {
        select: {
          symbol: true,
          assetType: true,
        },
      },
    },
  })

  if (transactions.length === 0) {
    console.log("No transactions found")
    process.exit(0)
  }

  console.log(`Found ${transactions.length} transactions`)

  // Get unique dates (end of each day with activity)
  const uniqueDates = [
    ...new Set(transactions.map((t) => t.date.toISOString().split("T")[0])),
  ].sort()

  console.log(`Processing ${uniqueDates.length} unique dates...`)

  // Track holdings state over time
  const holdingsState = new Map() // symbol -> { quantity, costBasis }

  let created = 0
  let errors = 0

  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr)

    // Process all transactions for this date
    const dayTransactions = transactions.filter(
      (t) => t.date.toISOString().split("T")[0] === dateStr
    )

    for (const tx of dayTransactions) {
      const symbol = tx.symbol || tx.holding?.symbol
      if (!symbol) continue

      const current = holdingsState.get(symbol) || {
        quantity: new Decimal(0),
        costBasis: new Decimal(0),
      }

      const quantity = tx.quantity ? new Decimal(tx.quantity.toString()) : new Decimal(0)
      const amount = tx.amount ? new Decimal(tx.amount.toString()) : new Decimal(0)

      // Update holdings based on transaction type
      switch (tx.type) {
        case "BUY":
        case "REINVEST_DIVIDEND":
          current.quantity = current.quantity.plus(quantity)
          current.costBasis = current.costBasis.plus(amount.abs())
          break

        case "SELL":
          current.quantity = current.quantity.minus(quantity)
          // Cost basis reduction is handled by the costBasisUsed field
          if (tx.costBasisUsed) {
            current.costBasis = current.costBasis.minus(
              new Decimal(tx.costBasisUsed.toString())
            )
          }
          break

        case "DEPOSIT":
        case "TRANSFER_IN":
        case "DIVIDEND":
        case "INTEREST":
          // For cash, increase balance
          if (symbol.startsWith("CASH.")) {
            current.quantity = current.quantity.plus(amount.abs())
          }
          break

        case "WITHDRAWAL":
        case "TRANSFER_OUT":
        case "FEE":
        case "TAX_WITHHOLDING":
          // For cash, decrease balance
          if (symbol.startsWith("CASH.")) {
            current.quantity = current.quantity.minus(amount.abs())
          }
          break

        case "ADJUSTMENT":
          // Adjustment can go either way
          if (symbol.startsWith("CASH.")) {
            current.quantity = current.quantity.plus(amount)
          }
          break
      }

      holdingsState.set(symbol, current)
    }

    // Calculate portfolio value at end of day
    let totalValue = new Decimal(0)
    let totalCostBasis = new Decimal(0)
    let cashValue = new Decimal(0)

    for (const [symbol, state] of holdingsState.entries()) {
      if (state.quantity.lte(0)) continue

      if (symbol.startsWith("CASH.")) {
        // Cash holdings - value equals quantity
        cashValue = cashValue.plus(state.quantity)
        totalValue = totalValue.plus(state.quantity)
        totalCostBasis = totalCostBasis.plus(state.costBasis)
      } else {
        // For non-cash, use cost basis as proxy for historical value
        // (We don't have historical prices, so this is an approximation)
        totalValue = totalValue.plus(state.costBasis)
        totalCostBasis = totalCostBasis.plus(state.costBasis)
      }
    }

    // Skip if no value
    if (totalValue.lte(0)) continue

    const gainLoss = totalValue.minus(totalCostBasis)
    const gainLossPct = totalCostBasis.gt(0)
      ? gainLoss.dividedBy(totalCostBasis).times(100)
      : new Decimal(0)

    try {
      await prisma.portfolioSnapshot.upsert({
        where: {
          portfolioId_date: {
            portfolioId,
            date: currentDate,
          },
        },
        update: {
          totalValue: totalValue.toDecimalPlaces(2),
          costBasis: totalCostBasis.toDecimalPlaces(2),
          cashValue: cashValue.toDecimalPlaces(2),
          gainLoss: gainLoss.toDecimalPlaces(2),
          gainLossPct: gainLossPct.toDecimalPlaces(4),
        },
        create: {
          portfolioId,
          date: currentDate,
          totalValue: totalValue.toDecimalPlaces(2),
          costBasis: totalCostBasis.toDecimalPlaces(2),
          cashValue: cashValue.toDecimalPlaces(2),
          gainLoss: gainLoss.toDecimalPlaces(2),
          gainLossPct: gainLossPct.toDecimalPlaces(4),
        },
      })
      created++

      // Progress indicator
      if (created % 50 === 0) {
        process.stdout.write(".")
      }
    } catch (err) {
      errors++
      console.error(`\nError creating snapshot for ${dateStr}:`, err.message)
    }
  }

  console.log(`\n\nCompleted:`)
  console.log(`  Snapshots created/updated: ${created}`)
  if (errors > 0) {
    console.log(`  Errors: ${errors}`)
  }

  // Show date range
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { portfolioId },
    orderBy: { date: "asc" },
    select: { date: true },
  })

  if (snapshots.length > 0) {
    const first = snapshots[0].date.toISOString().split("T")[0]
    const last = snapshots[snapshots.length - 1].date.toISOString().split("T")[0]
    console.log(`  Date range: ${first} to ${last}`)
  }
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
