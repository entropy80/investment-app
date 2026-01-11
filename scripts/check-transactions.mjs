import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const portfolioId = process.argv[2];
  if (!portfolioId) {
    console.error('Usage: node check-transactions.mjs <portfolio-id>');
    process.exit(1);
  }

  // Get accounts for this portfolio
  const accounts = await prisma.financialAccount.findMany({
    where: { portfolioId },
    select: { id: true, name: true }
  });

  console.log('Accounts:', accounts.map(a => a.name).join(', '));

  for (const account of accounts) {
    console.log('\n=== Account:', account.name, '===');

    // Get transactions grouped by type
    const transactions = await prisma.portfolioTransaction.findMany({
      where: { accountId: account.id },
      select: { type: true, amount: true, notes: true, date: true },
      orderBy: { date: 'asc' }
    });

    console.log('Total transactions:', transactions.length);

    // Group by type
    const byType = {};
    let totalSum = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount.toString());
      totalSum += amount;

      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, sum: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].sum += amount;
    }

    console.log('\nBy Type:');
    for (const [type, data] of Object.entries(byType)) {
      console.log(`  ${type}: ${data.count} transactions, sum: $${data.sum.toFixed(2)}`);
    }

    console.log('\nTotal sum of all amounts:', '$' + totalSum.toFixed(2));

    // Get cash holding
    const cashHolding = await prisma.holding.findFirst({
      where: {
        accountId: account.id,
        assetType: 'CASH'
      }
    });

    if (cashHolding) {
      console.log('Cash holding quantity:', '$' + parseFloat(cashHolding.quantity.toString()).toFixed(2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
