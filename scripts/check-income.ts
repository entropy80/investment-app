import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first user's portfolio (or specify email via command line arg)
  const email = process.argv[2]
  const user = email
    ? await prisma.user.findFirst({ where: { email } })
    : await prisma.user.findFirst()
  if (!user) {
    console.log('User not found. Usage: npx tsx scripts/check-income.ts [email]')
    return
  }
  console.log(`Analyzing user: ${user.email}\n`)

  const portfolio = await prisma.portfolio.findFirst({
    where: { userId: user.id },
    include: { accounts: true }
  })
  if (!portfolio) {
    console.log('Portfolio not found')
    return
  }

  const accountIds = portfolio.accounts.map(a => a.id)

  // Get transactions grouped by category with positive amounts
  const positiveByCategory = await prisma.portfolioTransaction.groupBy({
    by: ['category'],
    where: {
      accountId: { in: accountIds },
      amount: { gt: 0 }
    },
    _sum: { amount: true },
    _count: true
  })

  console.log('\nPositive amounts by category (potential income):')
  console.log('='.repeat(60))
  let total = 0
  for (const item of positiveByCategory.sort((a, b) => Number(b._sum.amount) - Number(a._sum.amount))) {
    const amount = Number(item._sum.amount)
    total += amount
    console.log(`  ${(item.category || 'null').padEnd(20)} $${amount.toLocaleString().padStart(12)} (${item._count} txns)`)
  }
  console.log('='.repeat(60))
  console.log(`  ${'TOTAL'.padEnd(20)} $${total.toLocaleString().padStart(12)}`)

  // Also show TRANSFER category breakdown
  console.log('\n\nTRANSFER category transactions:')
  console.log('='.repeat(60))
  const transfers = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      category: 'TRANSFER'
    },
    include: { account: { select: { name: true } } },
    orderBy: { amount: 'desc' },
    take: 20
  })

  for (const tx of transfers) {
    const sign = Number(tx.amount) > 0 ? '+' : ''
    console.log(`  ${tx.account.name.substring(0, 15).padEnd(15)} ${sign}$${Number(tx.amount).toLocaleString().padStart(12)} ${tx.date.toISOString().split('T')[0]}`)
  }

  // Check null category transactions with positive amounts
  console.log('\n\nNULL category transactions with positive amounts (top 25):')
  console.log('='.repeat(80))
  const nullCategoryTxns = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      category: null,
      amount: { gt: 0 }
    },
    include: { account: { select: { name: true } } },
    orderBy: { amount: 'desc' },
    take: 25
  })

  for (const tx of nullCategoryTxns) {
    const desc = (tx.notes || tx.merchant || tx.symbol || 'N/A').substring(0, 30)
    console.log(`  ${tx.account.name.substring(0, 12).padEnd(12)} +$${Number(tx.amount).toLocaleString().padStart(12)} ${tx.date.toISOString().split('T')[0]} ${tx.type.padEnd(12)} ${desc}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
