/**
 * Test import functionality with actual CSV files
 * Run with: pnpm tsx scripts/test-import.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import {
  importTransactions,
  detectBrokerFormat,
  parseCSV,
} from "../src/lib/import";

const prisma = new PrismaClient();

// CSV file paths - set these environment variables or update paths for your test files
const SCHWAB_CSV = process.env.SCHWAB_CSV_PATH || "./test-data/schwab-transactions.csv";
const IBKR_CSV = process.env.IBKR_CSV_PATH || "./test-data/ibkr-transactions.csv";

async function testSchwabImport(accountId: string) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING SCHWAB CSV IMPORT");
  console.log("=".repeat(60));

  // Read CSV file
  const csvContent = fs.readFileSync(SCHWAB_CSV, "utf-8");
  console.log(`\nFile: ${path.basename(SCHWAB_CSV)}`);
  console.log(`Size: ${csvContent.length} bytes`);

  // Detect format
  const format = detectBrokerFormat(csvContent);
  console.log(`Detected format: ${format}`);

  if (format !== "schwab") {
    console.error("ERROR: Expected Schwab format!");
    return;
  }

  // Parse without importing (preview)
  const transactions = parseCSV(csvContent, "schwab");
  console.log(`\nParsed ${transactions.length} transactions`);

  // Show sample transactions
  console.log("\nSample transactions (first 5):");
  for (const tx of transactions.slice(0, 5)) {
    console.log(`  ${tx.date.toISOString().split("T")[0]} | ${tx.type.padEnd(18)} | ${(tx.symbol || "-").padEnd(6)} | $${tx.amount.toFixed(2)}`);
  }

  // Show transaction type breakdown
  const typeCounts: Record<string, number> = {};
  for (const tx of transactions) {
    typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
  }
  console.log("\nTransaction types:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Dry run import
  console.log("\n--- DRY RUN ---");
  const dryResult = await importTransactions(csvContent, {
    accountId,
    brokerFormat: "schwab",
    dryRun: true,
    skipDuplicates: true,
  });

  console.log(`Total: ${dryResult.total}`);
  console.log(`Would import: ${dryResult.imported}`);
  console.log(`Would skip: ${dryResult.skipped}`);
  console.log(`Errors: ${dryResult.errors}`);

  // Actual import
  console.log("\n--- ACTUAL IMPORT ---");
  const result = await importTransactions(csvContent, {
    accountId,
    brokerFormat: "schwab",
    dryRun: false,
    skipDuplicates: true,
  });

  console.log(`Total: ${result.total}`);
  console.log(`Imported: ${result.imported}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Batch ID: ${result.importBatch}`);

  // Show any errors
  const errors = result.results.filter((r) => r.status === "error");
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors.slice(0, 5)) {
      console.log(`  ${e.transaction.date.toISOString().split("T")[0]} | ${e.transaction.symbol} | ${e.reason}`);
    }
  }

  return result;
}

async function testIBKRImport(accountId: string) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING IBKR CSV IMPORT");
  console.log("=".repeat(60));

  // Read CSV file
  const csvContent = fs.readFileSync(IBKR_CSV, "utf-8");
  console.log(`\nFile: ${path.basename(IBKR_CSV)}`);
  console.log(`Size: ${csvContent.length} bytes`);

  // Detect format
  const format = detectBrokerFormat(csvContent);
  console.log(`Detected format: ${format}`);

  if (format !== "ibkr") {
    console.error("ERROR: Expected IBKR format!");
    return;
  }

  // Parse without importing (preview)
  const transactions = parseCSV(csvContent, "ibkr");
  console.log(`\nParsed ${transactions.length} transactions`);

  // Show sample transactions
  console.log("\nSample transactions (first 5):");
  for (const tx of transactions.slice(0, 5)) {
    console.log(`  ${tx.date.toISOString().split("T")[0]} | ${tx.type.padEnd(18)} | ${(tx.symbol || "-").padEnd(10)} | $${tx.amount.toFixed(2)}`);
  }

  // Show transaction type breakdown
  const typeCounts: Record<string, number> = {};
  for (const tx of transactions) {
    typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
  }
  console.log("\nTransaction types:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Dry run import
  console.log("\n--- DRY RUN ---");
  const dryResult = await importTransactions(csvContent, {
    accountId,
    brokerFormat: "ibkr",
    dryRun: true,
    skipDuplicates: true,
  });

  console.log(`Total: ${dryResult.total}`);
  console.log(`Would import: ${dryResult.imported}`);
  console.log(`Would skip: ${dryResult.skipped}`);
  console.log(`Errors: ${dryResult.errors}`);

  // Actual import
  console.log("\n--- ACTUAL IMPORT ---");
  const result = await importTransactions(csvContent, {
    accountId,
    brokerFormat: "ibkr",
    dryRun: false,
    skipDuplicates: true,
  });

  console.log(`Total: ${result.total}`);
  console.log(`Imported: ${result.imported}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Batch ID: ${result.importBatch}`);

  // Show any errors
  const errors = result.results.filter((r) => r.status === "error");
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors.slice(0, 5)) {
      console.log(`  ${e.transaction.date.toISOString().split("T")[0]} | ${e.transaction.symbol} | ${e.reason}`);
    }
  }

  return result;
}

async function testDuplicateDetection(accountId: string) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING DUPLICATE DETECTION");
  console.log("=".repeat(60));

  // Try to import Schwab again - should skip all
  const csvContent = fs.readFileSync(SCHWAB_CSV, "utf-8");

  const result = await importTransactions(csvContent, {
    accountId,
    brokerFormat: "schwab",
    dryRun: false,
    skipDuplicates: true,
  });

  console.log(`\nRe-importing Schwab CSV...`);
  console.log(`Total: ${result.total}`);
  console.log(`Imported: ${result.imported} (should be 0)`);
  console.log(`Skipped: ${result.skipped} (should equal total)`);

  if (result.imported === 0 && result.skipped === result.total) {
    console.log("\n✓ Duplicate detection working correctly!");
  } else {
    console.log("\n✗ Duplicate detection may have issues");
  }
}

async function showDatabaseStats() {
  console.log("\n" + "=".repeat(60));
  console.log("DATABASE STATS");
  console.log("=".repeat(60));

  const txCount = await prisma.portfolioTransaction.count();
  const holdingCount = await prisma.holding.count();

  console.log(`\nTotal transactions: ${txCount}`);
  console.log(`Total holdings: ${holdingCount}`);

  // Show holdings
  const holdings = await prisma.holding.findMany({
    select: { symbol: true, name: true, assetType: true },
    orderBy: { symbol: "asc" },
  });

  console.log("\nHoldings created:");
  for (const h of holdings) {
    console.log(`  ${h.symbol.padEnd(10)} | ${h.assetType.padEnd(10)} | ${h.name}`);
  }
}

async function main() {
  console.log("Import Test Suite");
  console.log("=================\n");

  // Get account IDs - uses the test user email from environment or default
  const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
  const user = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!user) {
    console.error("Test user not found. Run setup-test-user.ts first.");
    return;
  }

  const schwabAccountId = `account-schwab-${user.id}`;
  const ibkrAccountId = `account-ibkr-${user.id}`;

  console.log(`User: ${user.email}`);
  console.log(`Schwab Account: ${schwabAccountId}`);
  console.log(`IBKR Account: ${ibkrAccountId}`);

  // Run tests
  await testSchwabImport(schwabAccountId);
  await testIBKRImport(ibkrAccountId);
  await testDuplicateDetection(schwabAccountId);
  await showDatabaseStats();

  console.log("\n" + "=".repeat(60));
  console.log("TEST COMPLETE");
  console.log("=".repeat(60) + "\n");
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
