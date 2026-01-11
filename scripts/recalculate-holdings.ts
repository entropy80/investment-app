/**
 * Recalculate all holdings from transactions
 * Run with: pnpm tsx scripts/recalculate-holdings.ts
 */

import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

async function cleanupForexHoldings() {
  console.log("\n--- Cleaning up forex pair holdings ---");

  // Find forex holdings (contain a dot like EUR.USD)
  const forexHoldings = await prisma.holding.findMany({
    where: {
      symbol: { contains: "." },
    },
    select: { id: true, symbol: true, accountId: true },
  });

  console.log(`Found ${forexHoldings.length} forex pair holdings to remove:`);
  for (const h of forexHoldings) {
    console.log(`  - ${h.symbol}`);
  }

  if (forexHoldings.length > 0) {
    // First, unlink transactions from these holdings
    await prisma.portfolioTransaction.updateMany({
      where: {
        holdingId: { in: forexHoldings.map((h) => h.id) },
      },
      data: { holdingId: null },
    });

    // Then delete the holdings
    const deleted = await prisma.holding.deleteMany({
      where: {
        id: { in: forexHoldings.map((h) => h.id) },
      },
    });

    console.log(`Deleted ${deleted.count} forex holdings`);
  }
}

async function recalculateHolding(holdingId: string, symbol: string) {
  const holding = await prisma.holding.findUnique({
    where: { id: holdingId },
    include: {
      transactions: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!holding) return null;

  let quantity = new Decimal(0);
  let totalCost = new Decimal(0);

  for (const tx of holding.transactions) {
    const txQty = tx.quantity
      ? new Decimal(tx.quantity.toString())
      : new Decimal(0);
    const txPrice = tx.price
      ? new Decimal(tx.price.toString())
      : new Decimal(0);

    switch (tx.type) {
      case "BUY":
      case "TRANSFER_IN":
      case "REINVEST_DIVIDEND":
        quantity = quantity.plus(txQty);
        if (txQty.greaterThan(0) && txPrice.greaterThan(0)) {
          totalCost = totalCost.plus(txQty.times(txPrice));
        }
        break;

      case "SELL":
      case "TRANSFER_OUT":
        if (quantity.greaterThan(0) && txQty.greaterThan(0)) {
          const costPerUnit = totalCost.dividedBy(quantity);
          totalCost = totalCost.minus(costPerUnit.times(txQty));
        }
        quantity = quantity.minus(txQty);
        break;

      case "SPLIT":
        if (txQty.greaterThan(0)) {
          quantity = quantity.times(txQty);
        }
        break;
    }
  }

  // Ensure non-negative
  if (quantity.lessThan(0)) quantity = new Decimal(0);
  if (totalCost.lessThan(0)) totalCost = new Decimal(0);

  const avgCostPerUnit = quantity.greaterThan(0)
    ? totalCost.dividedBy(quantity)
    : new Decimal(0);

  // Update holding
  const updated = await prisma.holding.update({
    where: { id: holdingId },
    data: {
      quantity: quantity.toFixed(8),
      costBasis: totalCost.toFixed(2),
      avgCostPerUnit: avgCostPerUnit.toFixed(8),
    },
  });

  return {
    symbol,
    quantity: quantity.toNumber(),
    costBasis: totalCost.toNumber(),
    avgCostPerUnit: avgCostPerUnit.toNumber(),
    txCount: holding.transactions.length,
  };
}

async function recalculateAllHoldings() {
  console.log("\n--- Recalculating all holdings ---");

  const holdings = await prisma.holding.findMany({
    where: {
      NOT: { symbol: { startsWith: "CASH." } }, // Exclude cash, will be calculated separately
    },
    select: { id: true, symbol: true },
    orderBy: { symbol: "asc" },
  });

  console.log(`Found ${holdings.length} security holdings to recalculate\n`);

  const results = [];
  for (const h of holdings) {
    const result = await recalculateHolding(h.id, h.symbol);
    if (result) {
      results.push(result);
      if (result.quantity > 0) {
        console.log(
          `  ${result.symbol.padEnd(8)} | Qty: ${result.quantity.toFixed(4).padStart(12)} | Cost: $${result.costBasis.toFixed(2).padStart(10)} | Avg: $${result.avgCostPerUnit.toFixed(2).padStart(8)} | ${result.txCount} tx`
        );
      } else {
        console.log(
          `  ${result.symbol.padEnd(8)} | Qty: 0 (fully sold) | ${result.txCount} tx`
        );
      }
    }
  }

  // Summary
  const activeHoldings = results.filter((r) => r.quantity > 0);
  const soldHoldings = results.filter((r) => r.quantity === 0);

  console.log("\n--- Summary ---");
  console.log(`Total holdings: ${results.length}`);
  console.log(`Active (qty > 0): ${activeHoldings.length}`);
  console.log(`Fully sold (qty = 0): ${soldHoldings.length}`);

  // Total portfolio value (cost basis)
  const totalCostBasis = activeHoldings.reduce(
    (sum, h) => sum + h.costBasis,
    0
  );
  console.log(`\nTotal cost basis (active): $${totalCostBasis.toFixed(2)}`);
}

async function calculateCashBalances() {
  console.log("\n--- Calculating cash balances ---");

  // Get all accounts
  const accounts = await prisma.financialAccount.findMany({
    select: { id: true, name: true, currency: true },
  });

  for (const account of accounts) {
    // Get all transactions for this account
    const transactions = await prisma.portfolioTransaction.findMany({
      where: { accountId: account.id },
      select: { type: true, amount: true },
    });

    let balance = new Decimal(0);
    for (const tx of transactions) {
      const amount = new Decimal(tx.amount.toString());
      // REINVEST_DIVIDEND doesn't affect cash
      if (tx.type !== "REINVEST_DIVIDEND") {
        balance = balance.plus(amount);
      }
    }

    const symbol = `CASH.${account.currency}`;

    // Find or create cash holding
    const existing = await prisma.holding.findUnique({
      where: {
        accountId_symbol: {
          accountId: account.id,
          symbol,
        },
      },
    });

    if (existing) {
      await prisma.holding.update({
        where: { id: existing.id },
        data: {
          quantity: balance.toFixed(2),
          costBasis: balance.toFixed(2),
          avgCostPerUnit: "1",
        },
      });
    } else {
      await prisma.holding.create({
        data: {
          accountId: account.id,
          symbol,
          name: `${account.currency} Cash`,
          assetType: "CASH",
          quantity: balance.toFixed(2),
          costBasis: balance.toFixed(2),
          avgCostPerUnit: "1",
          currency: account.currency,
        },
      });
    }

    console.log(
      `  ${account.name.padEnd(25)} | ${symbol.padEnd(10)} | $${balance.toFixed(2)}`
    );
  }
}

async function main() {
  console.log("Holdings Recalculation Script");
  console.log("=============================");

  await cleanupForexHoldings();
  await recalculateAllHoldings();
  await calculateCashBalances();

  console.log("\n=============================");
  console.log("Recalculation complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
