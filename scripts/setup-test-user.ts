/**
 * Setup test user with portfolio and accounts for import testing
 * Run with: pnpm tsx scripts/setup-test-user.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Configure these values for your test user
  const email = process.env.TEST_USER_EMAIL || "test@example.com";
  const password = process.env.TEST_USER_PASSWORD || "TestPassword123!";
  const name = process.env.TEST_USER_NAME || "Test User";

  console.log("Setting up test user...\n");

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create or update user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: "USER",
      emailVerified: new Date(),
    },
  });

  console.log(`✓ User created/updated: ${user.email} (${user.id})`);

  // Create portfolio
  const portfolio = await prisma.portfolio.upsert({
    where: {
      id: `portfolio-${user.id}`,
    },
    update: {},
    create: {
      id: `portfolio-${user.id}`,
      userId: user.id,
      name: "Personal Investments",
      description: "Main investment portfolio",
      isDefault: true,
      baseCurrency: "USD",
    },
  });

  console.log(`✓ Portfolio created: ${portfolio.name} (${portfolio.id})`);

  // Create financial accounts
  const accounts = [
    {
      id: `account-schwab-${user.id}`,
      name: "Charles Schwab",
      institution: "Charles Schwab",
      accountType: "BROKERAGE" as const,
      currency: "USD",
    },
    {
      id: `account-ibkr-${user.id}`,
      name: "Interactive Brokers",
      institution: "Interactive Brokers",
      accountType: "BROKERAGE" as const,
      currency: "USD",
    },
    {
      id: `account-nbk-${user.id}`,
      name: "National Bank of Kuwait",
      institution: "National Bank of Kuwait",
      accountType: "BANK" as const,
      currency: "KWD",
    },
    {
      id: `account-boa-${user.id}`,
      name: "Bank of America",
      institution: "Bank of America",
      accountType: "BANK" as const,
      currency: "USD",
    },
    {
      id: `account-chase-${user.id}`,
      name: "JP Morgan Chase",
      institution: "JP Morgan Chase",
      accountType: "BANK" as const,
      currency: "USD",
    },
    {
      id: `account-realestate-${user.id}`,
      name: "Sample Property",
      institution: "Real Estate Holdings",
      accountType: "REAL_ESTATE" as const,
      currency: "GBP",
    },
  ];

  for (const acc of accounts) {
    const account = await prisma.financialAccount.upsert({
      where: { id: acc.id },
      update: {},
      create: {
        ...acc,
        portfolioId: portfolio.id,
        isActive: true,
      },
    });
    console.log(`✓ Account created: ${account.name} (${account.id})`);
  }

  console.log("\n========================================");
  console.log("Test setup complete!");
  console.log("========================================\n");
  console.log("User credentials:");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\nAccount IDs for import testing:`);
  console.log(`  Schwab:  account-schwab-${user.id}`);
  console.log(`  IBKR:    account-ibkr-${user.id}`);
  console.log("\n");
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
