#!/usr/bin/env node

/**
 * Seed Demo User Script
 *
 * Creates a demo user with sample portfolio data for the read-only demo mode.
 *
 * Usage: node scripts/seed-demo-user.mjs
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_USER_EMAIL = 'demo@localhost'
// Demo user password - not used for login (demo uses special route that bypasses password)
// This is randomly generated at seed time for database record only
const DEMO_USER_PASSWORD = `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`

async function main() {
  console.log('🌱 Seeding demo user...\n')

  // Check if demo user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL }
  })

  if (existingUser) {
    console.log('⚠️  Demo user already exists. Deleting and recreating...')
    await prisma.user.delete({ where: { email: DEMO_USER_EMAIL } })
  }

  // Create demo user
  const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 10)
  const demoUser = await prisma.user.create({
    data: {
      email: DEMO_USER_EMAIL,
      name: 'Demo User',
      password: hashedPassword,
      role: 'USER',
      isDemo: true,
      emailVerified: new Date(),
    }
  })
  console.log(`✅ Created demo user: ${demoUser.email} (ID: ${demoUser.id})`)

  // Create demo portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      id: 'demo-portfolio',
      userId: demoUser.id,
      name: 'Demo Portfolio',
      description: 'Sample investment portfolio showcasing the portfolio tracker features.',
      baseCurrency: 'USD',
      isDefault: true,
    }
  })
  console.log(`✅ Created portfolio: ${portfolio.name}`)

  // Create demo accounts
  const schwabAccount = await prisma.financialAccount.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Schwab Brokerage',
      institution: 'Charles Schwab',
      accountType: 'BROKERAGE',
      currency: 'USD',
    }
  })

  const cryptoAccount = await prisma.financialAccount.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Coinbase',
      institution: 'Coinbase',
      accountType: 'CRYPTO_EXCHANGE',
      currency: 'USD',
    }
  })

  // Foreign currency bank accounts
  const saxoAccount = await prisma.financialAccount.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Saxo Bank',
      institution: 'Saxo Bank',
      accountType: 'BANK',
      currency: 'EUR',
    }
  })

  const wiseAccount = await prisma.financialAccount.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Wise',
      institution: 'Wise',
      accountType: 'BANK',
      currency: 'CHF',
    }
  })

  const monzoAccount = await prisma.financialAccount.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Monzo',
      institution: 'Monzo',
      accountType: 'BANK',
      currency: 'GBP',
    }
  })

  console.log(`✅ Created accounts: ${schwabAccount.name}, ${cryptoAccount.name}, ${saxoAccount.name}, ${wiseAccount.name}, ${monzoAccount.name}`)

  // Sample holdings data
  // Note: AAPL and MSFT quantities/costBasis reflect state AFTER sells
  // AAPL: Originally 25 shares, sold 10, now 15 shares
  // MSFT: Originally 15 shares, sold 5, now 10 shares
  // CASH.USD: Original $5,000 + sell proceeds $4,705 = $9,705
  const holdingsData = [
    // Schwab holdings
    {
      accountId: schwabAccount.id,
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      assetType: 'ETF',
      quantity: 50,
      costBasis: 11250.00,
      avgCostPerUnit: 225.00,
      currency: 'USD',
    },
    {
      accountId: schwabAccount.id,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'STOCK',
      quantity: 15,  // Was 25, sold 10
      costBasis: 2625.00,  // 15 × $175
      avgCostPerUnit: 175.00,
      currency: 'USD',
    },
    {
      accountId: schwabAccount.id,
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      assetType: 'STOCK',
      quantity: 10,  // Was 15, sold 5
      costBasis: 3750.00,  // 10 × $375
      avgCostPerUnit: 375.00,
      currency: 'USD',
    },
    {
      accountId: schwabAccount.id,
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      assetType: 'STOCK',
      quantity: 20,
      costBasis: 3400.00,
      avgCostPerUnit: 170.00,
      currency: 'USD',
    },
    {
      accountId: schwabAccount.id,
      symbol: 'CASH.USD',
      name: 'US Dollar Cash',
      assetType: 'CASH',
      quantity: 9705.00,  // Original $5,000 + $4,705 from sells
      costBasis: 9705.00,
      avgCostPerUnit: 1.00,
      currency: 'USD',
    },
    // Crypto holdings
    {
      accountId: cryptoAccount.id,
      symbol: 'BTC',
      name: 'Bitcoin',
      assetType: 'CRYPTO',
      quantity: 0.15,
      costBasis: 6750.00,
      avgCostPerUnit: 45000.00,
      currency: 'USD',
    },
    {
      accountId: cryptoAccount.id,
      symbol: 'ETH',
      name: 'Ethereum',
      assetType: 'CRYPTO',
      quantity: 2.5,
      costBasis: 5000.00,
      avgCostPerUnit: 2000.00,
      currency: 'USD',
    },
    // Foreign currency cash holdings
    {
      accountId: saxoAccount.id,
      symbol: 'CASH.EUR',
      name: 'Euro Cash',
      assetType: 'CASH',
      quantity: 10000.00,
      costBasis: 10000.00,
      avgCostPerUnit: 1.00,
      currency: 'EUR',
    },
    {
      accountId: wiseAccount.id,
      symbol: 'CASH.CHF',
      name: 'Swiss Franc Cash',
      assetType: 'CASH',
      quantity: 15000.00,
      costBasis: 15000.00,
      avgCostPerUnit: 1.00,
      currency: 'CHF',
    },
    {
      accountId: monzoAccount.id,
      symbol: 'CASH.GBP',
      name: 'British Pound Cash',
      assetType: 'CASH',
      quantity: 20000.00,
      costBasis: 20000.00,
      avgCostPerUnit: 1.00,
      currency: 'GBP',
    },
  ]

  const holdings = []
  for (const holdingData of holdingsData) {
    const holding = await prisma.holding.create({
      data: holdingData
    })
    holdings.push(holding)
  }
  console.log(`✅ Created ${holdings.length} holdings`)

  // Sample transactions (create tax lots for buy transactions)
  // Note: AAPL buy is 16+ months ago for long-term gain demonstration
  // SELL transactions added for realized gains display
  const transactionsData = [
    // VTI transactions
    {
      accountId: schwabAccount.id,
      holdingId: holdings[0].id,
      type: 'BUY',
      symbol: 'VTI',
      quantity: 30,
      price: 220.00,
      amount: -6600.00,
      fees: 0,
      date: new Date('2024-06-15'),
      notes: 'Initial purchase',
    },
    {
      accountId: schwabAccount.id,
      holdingId: holdings[0].id,
      type: 'BUY',
      symbol: 'VTI',
      quantity: 20,
      price: 232.50,
      amount: -4650.00,
      fees: 0,
      date: new Date('2024-09-20'),
      notes: 'Added to position',
    },
    {
      accountId: schwabAccount.id,
      holdingId: holdings[0].id,
      type: 'DIVIDEND',
      symbol: 'VTI',
      quantity: 0,
      price: 0,
      amount: 45.50,
      date: new Date('2025-03-15'),
      notes: 'Quarterly dividend',
    },
    // AAPL transactions - BUY date set to 16+ months ago for long-term gain
    {
      accountId: schwabAccount.id,
      holdingId: holdings[1].id,
      type: 'BUY',
      symbol: 'AAPL',
      quantity: 25,
      price: 175.00,
      amount: -4375.00,
      fees: 0,
      date: new Date('2024-09-01'),  // ~16 months before sell date
      notes: 'Initial purchase',
    },
    {
      accountId: schwabAccount.id,
      holdingId: holdings[1].id,
      type: 'DIVIDEND',
      symbol: 'AAPL',
      quantity: 0,
      price: 0,
      amount: 6.25,
      date: new Date('2025-02-15'),
    },
    // AAPL SELL - Long-term gain (held >1 year)
    // Sold 10 shares @ $248 = $2,480 proceeds
    // Cost basis: 10 × $175 = $1,750
    // Realized gain: $730 (long-term, ~488 days)
    {
      accountId: schwabAccount.id,
      holdingId: holdings[1].id,
      type: 'SELL',
      symbol: 'AAPL',
      quantity: 10,
      price: 248.00,
      amount: 2480.00,
      fees: 0,
      date: new Date('2026-01-01'),
      notes: 'Partial sale - long-term gain',
      costBasisUsed: 1750.00,
      realizedGainLoss: 730.00,
      holdingPeriodDays: 488,
    },
    // MSFT transactions
    {
      accountId: schwabAccount.id,
      holdingId: holdings[2].id,
      type: 'BUY',
      symbol: 'MSFT',
      quantity: 15,
      price: 375.00,
      amount: -5625.00,
      fees: 0,
      date: new Date('2024-04-05'),  // ~9 months before sell (short-term)
      notes: 'Initial purchase',
    },
    // MSFT SELL - Short-term gain (held <1 year)
    // Sold 5 shares @ $445 = $2,225 proceeds
    // Cost basis: 5 × $375 = $1,875
    // Realized gain: $350 (short-term, ~271 days)
    {
      accountId: schwabAccount.id,
      holdingId: holdings[2].id,
      type: 'SELL',
      symbol: 'MSFT',
      quantity: 5,
      price: 445.00,
      amount: 2225.00,
      fees: 0,
      date: new Date('2026-01-01'),
      notes: 'Partial sale - short-term gain',
      costBasisUsed: 1875.00,
      realizedGainLoss: 350.00,
      holdingPeriodDays: 271,
    },
    // GOOGL transactions
    {
      accountId: schwabAccount.id,
      holdingId: holdings[3].id,
      type: 'BUY',
      symbol: 'GOOGL',
      quantity: 20,
      price: 170.00,
      amount: -3400.00,
      fees: 0,
      date: new Date('2024-05-12'),
    },
    // Cash deposit (original amount before sells)
    {
      accountId: schwabAccount.id,
      holdingId: holdings[4].id,
      type: 'DEPOSIT',
      symbol: 'CASH.USD',
      quantity: 5000.00,
      price: 1.00,
      amount: 5000.00,
      date: new Date('2024-01-05'),
      notes: 'Initial deposit',
    },
    // BTC transactions
    {
      accountId: cryptoAccount.id,
      holdingId: holdings[5].id,
      type: 'BUY',
      symbol: 'BTC',
      quantity: 0.10,
      price: 42000.00,
      amount: -4200.00,
      fees: 10.50,
      date: new Date('2024-01-20'),
    },
    {
      accountId: cryptoAccount.id,
      holdingId: holdings[5].id,
      type: 'BUY',
      symbol: 'BTC',
      quantity: 0.05,
      price: 51000.00,
      amount: -2550.00,
      fees: 6.38,
      date: new Date('2024-07-15'),
    },
    // ETH transactions
    {
      accountId: cryptoAccount.id,
      holdingId: holdings[6].id,
      type: 'BUY',
      symbol: 'ETH',
      quantity: 2.5,
      price: 2000.00,
      amount: -5000.00,
      fees: 12.50,
      date: new Date('2024-03-01'),
    },
    // Foreign currency cash deposits
    {
      accountId: saxoAccount.id,
      holdingId: holdings[7].id,
      type: 'DEPOSIT',
      symbol: 'CASH.EUR',
      quantity: 10000.00,
      price: 1.00,
      amount: 10000.00,
      currency: 'EUR',
      date: new Date('2024-06-01'),
      notes: 'Initial EUR deposit',
    },
    {
      accountId: wiseAccount.id,
      holdingId: holdings[8].id,
      type: 'DEPOSIT',
      symbol: 'CASH.CHF',
      quantity: 15000.00,
      price: 1.00,
      amount: 15000.00,
      currency: 'CHF',
      date: new Date('2024-07-15'),
      notes: 'Initial CHF deposit',
    },
    {
      accountId: monzoAccount.id,
      holdingId: holdings[9].id,
      type: 'DEPOSIT',
      symbol: 'CASH.GBP',
      quantity: 20000.00,
      price: 1.00,
      amount: 20000.00,
      currency: 'GBP',
      date: new Date('2024-08-01'),
      notes: 'Initial GBP deposit',
    },
  ]

  let txCount = 0
  const taxLotsByHolding = {}  // Track tax lots by holding ID for SELL consumption

  for (const txData of transactionsData) {
    const tx = await prisma.portfolioTransaction.create({
      data: txData
    })

    // Create tax lots for BUY transactions
    if (txData.type === 'BUY' && txData.holdingId && txData.quantity && txData.price) {
      const taxLot = await prisma.taxLot.create({
        data: {
          holdingId: txData.holdingId,
          transactionId: tx.id,
          quantity: txData.quantity,
          remaining: txData.quantity,
          costBasis: Math.abs(txData.amount),
          costPerUnit: txData.price,
          acquiredAt: txData.date,
        }
      })
      // Track for SELL consumption
      if (!taxLotsByHolding[txData.holdingId]) {
        taxLotsByHolding[txData.holdingId] = []
      }
      taxLotsByHolding[txData.holdingId].push(taxLot)
    }

    // For SELL transactions, consume tax lots (reduce remaining) and link to transaction
    if (txData.type === 'SELL' && txData.holdingId && txData.quantity) {
      let remainingToSell = txData.quantity
      const lotsForHolding = taxLotsByHolding[txData.holdingId] || []

      for (const lot of lotsForHolding) {
        if (remainingToSell <= 0) break
        if (lot.remaining <= 0) continue

        const sellFromLot = Math.min(remainingToSell, lot.remaining)
        lot.remaining -= sellFromLot
        remainingToSell -= sellFromLot

        // Update the tax lot's remaining quantity
        await prisma.taxLot.update({
          where: { id: lot.id },
          data: { remaining: lot.remaining }
        })

        // Link the tax lot to the sell transaction
        await prisma.portfolioTransaction.update({
          where: { id: tx.id },
          data: {
            taxLots: {
              connect: { id: lot.id }
            }
          }
        })
      }
    }
    txCount++
  }
  console.log(`✅ Created ${txCount} transactions with tax lots`)

  // Add some price snapshots (simulated current prices)
  const priceSnapshots = [
    { holdingId: holdings[0].id, price: 265.50, source: 'demo' },  // VTI
    { holdingId: holdings[1].id, price: 248.00, source: 'demo' },  // AAPL
    { holdingId: holdings[2].id, price: 445.00, source: 'demo' },  // MSFT
    { holdingId: holdings[3].id, price: 192.00, source: 'demo' },  // GOOGL
    { holdingId: holdings[4].id, price: 1.00, source: 'demo' },    // CASH.USD
    { holdingId: holdings[5].id, price: 98500.00, source: 'demo' }, // BTC
    { holdingId: holdings[6].id, price: 3850.00, source: 'demo' },  // ETH
    { holdingId: holdings[7].id, price: 1.00, source: 'demo' },    // CASH.EUR
    { holdingId: holdings[8].id, price: 1.00, source: 'demo' },    // CASH.CHF
    { holdingId: holdings[9].id, price: 1.00, source: 'demo' },    // CASH.GBP
  ]

  for (const snapshot of priceSnapshots) {
    await prisma.priceSnapshot.create({
      data: {
        ...snapshot,
        snapshotAt: new Date(),
      }
    })
  }
  console.log(`✅ Created ${priceSnapshots.length} price snapshots`)

  // ============================================
  // BUDGET DATA FOR 2026
  // ============================================

  const BUDGET_TEMPLATE = {
    INCOME: {
      name: "INCOME",
      children: ["Wage", "Rental Income", "Allowance", "Other"]
    },
    HOME_EXPENSES: {
      name: "HOME EXPENSES",
      children: ["Rent", "Electricity", "Water/Sewer/Trash", "Internet", "Maintenance", "House Cleaning", "Home Supplies", "Lawn/Garden"]
    },
    TRANSPORTATION: {
      name: "TRANSPORTATION",
      children: ["DMV Fees", "Auto Insurance", "Repairs", "Fuel"]
    },
    HEALTH: {
      name: "HEALTH",
      children: ["Health Insurance", "Doctor/Dentist", "Medicine/Drugs", "Veterinarian"]
    },
    DAILY_LIVING: {
      name: "DAILY LIVING",
      children: ["Groceries (Instacart)", "Amazon & Whole Foods", "Trader Joe's", "Other Supplements", "Cleaning & Care", "Clothing", "Moods", "Dining/Eating Out"]
    },
    SUBSCRIPTIONS: {
      name: "SUBSCRIPTIONS",
      children: ["Google Fi", "Zain Mobile Data", "Spotify", "YouTube", "Other"]
    },
    MISCELLANEOUS: {
      name: "MISCELLANEOUS",
      children: ["Taxes", "Legal Fees", "Tax CPA", "Storage"]
    }
  }

  const BUDGET_CATEGORY_ORDER = [
    "INCOME", "HOME_EXPENSES", "TRANSPORTATION", "HEALTH",
    "DAILY_LIVING", "SUBSCRIPTIONS", "MISCELLANEOUS"
  ]

  // Sample monthly budget amounts (realistic demo data)
  const DEMO_BUDGET_AMOUNTS = {
    // INCOME
    "Wage": 8500,
    "Rental Income": 2200,
    "Allowance": 0,
    "Other": 150,
    // HOME EXPENSES
    "Rent": 2400,
    "Electricity": 120,
    "Water/Sewer/Trash": 75,
    "Internet": 80,
    "Maintenance": 100,
    "House Cleaning": 200,
    "Home Supplies": 50,
    "Lawn/Garden": 0,
    // TRANSPORTATION
    "DMV Fees": 0,
    "Auto Insurance": 150,
    "Repairs": 50,
    "Fuel": 200,
    // HEALTH
    "Health Insurance": 450,
    "Doctor/Dentist": 100,
    "Medicine/Drugs": 50,
    "Veterinarian": 0,
    // DAILY LIVING
    "Groceries (Instacart)": 400,
    "Amazon & Whole Foods": 200,
    "Trader Joe's": 150,
    "Other Supplements": 75,
    "Cleaning & Care": 50,
    "Clothing": 100,
    "Moods": 50,
    "Dining/Eating Out": 300,
    // SUBSCRIPTIONS
    "Google Fi": 55,
    "Zain Mobile Data": 25,
    "Spotify": 12,
    "YouTube": 14,
    "Other": 30,
    // MISCELLANEOUS
    "Taxes": 0,
    "Legal Fees": 0,
    "Tax CPA": 0,
    "Storage": 150,
  }

  let categoriesCreated = 0
  let budgetItemsCreated = 0

  for (let i = 0; i < BUDGET_CATEGORY_ORDER.length; i++) {
    const categoryKey = BUDGET_CATEGORY_ORDER[i]
    const template = BUDGET_TEMPLATE[categoryKey]

    // Create parent category
    const parentCategory = await prisma.budgetCategory.create({
      data: {
        userId: demoUser.id,
        name: template.name,
        code: categoryKey,
        parentId: null,
        sortOrder: i,
        isActive: true,
      }
    })
    categoriesCreated++

    // Create child categories and budget items
    for (let j = 0; j < template.children.length; j++) {
      const childName = template.children[j]

      const childCategory = await prisma.budgetCategory.create({
        data: {
          userId: demoUser.id,
          name: childName,
          code: null,
          parentId: parentCategory.id,
          sortOrder: j,
          isActive: true,
        }
      })
      categoriesCreated++

      // Create budget items for all 12 months of 2026
      const monthlyAmount = DEMO_BUDGET_AMOUNTS[childName] || 0
      for (let month = 1; month <= 12; month++) {
        await prisma.budgetItem.create({
          data: {
            categoryId: childCategory.id,
            year: 2026,
            month: month,
            amount: monthlyAmount,
            currency: 'USD',
          }
        })
        budgetItemsCreated++
      }
    }
  }

  console.log(`✅ Created ${categoriesCreated} budget categories`)
  console.log(`✅ Created ${budgetItemsCreated} budget items for 2026`)

  console.log('\n🎉 Demo user seeding complete!')
  console.log(`\n📋 Summary:`)
  console.log(`   - User: ${DEMO_USER_EMAIL}`)
  console.log(`   - Portfolio ID: ${portfolio.id}`)
  console.log(`   - Accounts: 5 (Schwab, Coinbase, Saxo, Wise, Monzo)`)
  console.log(`   - Holdings: ${holdings.length}`)
  console.log(`   - Transactions: ${txCount}`)
  console.log(`   - Realized Gains: $1,080 (AAPL: $730 LT, MSFT: $350 ST)`)
  console.log(`   - Cash Balances: $9,705 USD, €10,000, CHF 15,000, £20,000`)
  console.log(`   - Budget Categories: ${categoriesCreated} (7 groups + 35 subcategories)`)
  console.log(`   - Budget Items: ${budgetItemsCreated} (12 months × 35 categories)`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
