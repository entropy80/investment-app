import { prisma } from '@/lib/prisma'
import {
  AssetType,
  PortfolioTransactionType,
  Prisma,
} from '@prisma/client'

// ============================================================================
// CSV Import Service for Portfolio Data
// ============================================================================

export interface CSVHoldingRow {
  symbol: string
  name: string
  assetType?: string
  quantity: string
  costBasis?: string
  avgCostPerUnit?: string
  currency?: string
}

export interface CSVTransactionRow {
  date: string
  type: string
  symbol?: string
  quantity?: string
  price?: string
  amount: string
  fees?: string
  notes?: string
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

/**
 * Parse CSV string into rows
 */
export function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n')
  return lines.map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  })
}

/**
 * Map CSV headers to expected fields
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '')

  const mappings: Record<string, string> = {
    ticker: 'symbol',
    stock: 'symbol',
    asset: 'symbol',
    security: 'symbol',
    description: 'name',
    securityname: 'name',
    assetname: 'name',
    shares: 'quantity',
    units: 'quantity',
    qty: 'quantity',
    cost: 'costBasis',
    totalcost: 'costBasis',
    costbasis: 'costBasis',
    avgprice: 'avgCostPerUnit',
    averagecost: 'avgCostPerUnit',
    avgcost: 'avgCostPerUnit',
    transactiontype: 'type',
    action: 'type',
    transactiondate: 'date',
    tradedate: 'date',
    priceperunit: 'price',
    shareprice: 'price',
    totalamount: 'amount',
    total: 'amount',
    fee: 'fees',
    commission: 'fees',
    memo: 'notes',
    comment: 'notes',
  }

  return mappings[normalized] || normalized
}

/**
 * Parse asset type from string
 */
function parseAssetType(value: string): AssetType {
  const normalized = value?.toLowerCase().replace(/[^a-z]/g, '') || ''

  const mappings: Record<string, AssetType> = {
    stock: 'STOCK',
    equity: 'STOCK',
    etf: 'ETF',
    exchangetradedfund: 'ETF',
    mutualfund: 'MUTUAL_FUND',
    mutual: 'MUTUAL_FUND',
    bond: 'BOND',
    fixedincome: 'BOND',
    crypto: 'CRYPTO',
    cryptocurrency: 'CRYPTO',
    bitcoin: 'CRYPTO',
    cash: 'CASH',
    moneymarket: 'CASH',
    realestate: 'REAL_ESTATE',
    property: 'REAL_ESTATE',
    commodity: 'COMMODITY',
    gold: 'COMMODITY',
  }

  return mappings[normalized] || 'OTHER'
}

/**
 * Parse transaction type from string
 */
function parseTransactionType(value: string): PortfolioTransactionType {
  const normalized = value?.toLowerCase().replace(/[^a-z]/g, '') || ''

  const mappings: Record<string, PortfolioTransactionType> = {
    buy: 'BUY',
    purchase: 'BUY',
    bought: 'BUY',
    sell: 'SELL',
    sold: 'SELL',
    sale: 'SELL',
    dividend: 'DIVIDEND',
    div: 'DIVIDEND',
    interest: 'INTEREST',
    int: 'INTEREST',
    deposit: 'DEPOSIT',
    contribution: 'DEPOSIT',
    withdrawal: 'WITHDRAWAL',
    withdraw: 'WITHDRAWAL',
    transferin: 'TRANSFER_IN',
    transferout: 'TRANSFER_OUT',
    fee: 'FEE',
    commission: 'FEE',
    split: 'SPLIT',
    stocksplit: 'SPLIT',
  }

  return mappings[normalized] || 'OTHER'
}

/**
 * Import holdings from CSV data
 */
export async function importHoldings(
  accountId: string,
  userId: string,
  csvContent: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  // Verify account ownership
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId },
    include: { portfolio: { select: { userId: true } } },
  })

  if (!account || account.portfolio.userId !== userId) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['Account not found or access denied'],
    }
  }

  const rows = parseCSV(csvContent)
  if (rows.length < 2) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV file must have a header row and at least one data row'],
    }
  }

  // Parse headers
  const headers = rows[0].map(normalizeHeader)
  const symbolIdx = headers.indexOf('symbol')
  const nameIdx = headers.indexOf('name')
  const quantityIdx = headers.indexOf('quantity')
  const costBasisIdx = headers.indexOf('costBasis')
  const assetTypeIdx = headers.indexOf('assetType')
  const currencyIdx = headers.indexOf('currency')
  const avgCostIdx = headers.indexOf('avgCostPerUnit')

  if (symbolIdx === -1) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV must contain a Symbol column'],
    }
  }

  if (quantityIdx === -1) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV must contain a Quantity column'],
    }
  }

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      const symbol = row[symbolIdx]?.trim().toUpperCase()
      const name = nameIdx >= 0 ? row[nameIdx]?.trim() : symbol
      const quantity = parseFloat(row[quantityIdx]) || 0
      const costBasis = costBasisIdx >= 0 ? parseFloat(row[costBasisIdx]) : undefined
      const assetType = assetTypeIdx >= 0 ? parseAssetType(row[assetTypeIdx]) : 'STOCK'
      const currency = currencyIdx >= 0 ? row[currencyIdx]?.trim().toUpperCase() : 'USD'
      const avgCostPerUnit = avgCostIdx >= 0 ? parseFloat(row[avgCostIdx]) : undefined

      if (!symbol || quantity <= 0) {
        result.skipped++
        result.errors.push(`Row ${rowNum}: Invalid symbol or quantity`)
        continue
      }

      // Upsert holding (update if exists, create if not)
      await prisma.holding.upsert({
        where: {
          accountId_symbol: { accountId, symbol },
        },
        update: {
          name,
          assetType,
          quantity: new Prisma.Decimal(quantity),
          costBasis: costBasis ? new Prisma.Decimal(costBasis) : undefined,
          avgCostPerUnit: avgCostPerUnit ? new Prisma.Decimal(avgCostPerUnit) : undefined,
          currency: currency || 'USD',
        },
        create: {
          accountId,
          symbol,
          name,
          assetType,
          quantity: new Prisma.Decimal(quantity),
          costBasis: costBasis ? new Prisma.Decimal(costBasis) : null,
          avgCostPerUnit: avgCostPerUnit ? new Prisma.Decimal(avgCostPerUnit) : null,
          currency: currency || 'USD',
        },
      })

      result.imported++
    } catch (error: any) {
      result.skipped++
      result.errors.push(`Row ${rowNum}: ${error.message}`)
    }
  }

  return result
}

/**
 * Import transactions from CSV data
 */
export async function importTransactions(
  accountId: string,
  userId: string,
  csvContent: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  // Verify account ownership
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId },
    include: { portfolio: { select: { userId: true } } },
  })

  if (!account || account.portfolio.userId !== userId) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['Account not found or access denied'],
    }
  }

  const rows = parseCSV(csvContent)
  if (rows.length < 2) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV file must have a header row and at least one data row'],
    }
  }

  // Parse headers
  const headers = rows[0].map(normalizeHeader)
  const dateIdx = headers.indexOf('date')
  const typeIdx = headers.indexOf('type')
  const symbolIdx = headers.indexOf('symbol')
  const quantityIdx = headers.indexOf('quantity')
  const priceIdx = headers.indexOf('price')
  const amountIdx = headers.indexOf('amount')
  const feesIdx = headers.indexOf('fees')
  const notesIdx = headers.indexOf('notes')

  if (dateIdx === -1) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV must contain a Date column'],
    }
  }

  if (amountIdx === -1) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV must contain an Amount column'],
    }
  }

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      const dateStr = row[dateIdx]?.trim()
      const date = new Date(dateStr)

      if (isNaN(date.getTime())) {
        result.skipped++
        result.errors.push(`Row ${rowNum}: Invalid date format`)
        continue
      }

      const type = typeIdx >= 0 ? parseTransactionType(row[typeIdx]) : 'OTHER'
      const symbol = symbolIdx >= 0 ? row[symbolIdx]?.trim().toUpperCase() : undefined
      const quantity = quantityIdx >= 0 ? parseFloat(row[quantityIdx]) : undefined
      const price = priceIdx >= 0 ? parseFloat(row[priceIdx]) : undefined
      const amount = parseFloat(row[amountIdx]) || 0
      const fees = feesIdx >= 0 ? parseFloat(row[feesIdx]) : undefined
      const notes = notesIdx >= 0 ? row[notesIdx]?.trim() : undefined

      // Find associated holding if symbol provided
      let holdingId: string | undefined
      if (symbol) {
        const holding = await prisma.holding.findUnique({
          where: { accountId_symbol: { accountId, symbol } },
        })
        holdingId = holding?.id
      }

      await prisma.portfolioTransaction.create({
        data: {
          accountId,
          holdingId,
          type,
          symbol,
          quantity: quantity ? new Prisma.Decimal(quantity) : null,
          price: price ? new Prisma.Decimal(price) : null,
          amount: new Prisma.Decimal(amount),
          fees: fees ? new Prisma.Decimal(fees) : null,
          currency: account.currency,
          date,
          notes,
        },
      })

      result.imported++
    } catch (error: any) {
      result.skipped++
      result.errors.push(`Row ${rowNum}: ${error.message}`)
    }
  }

  return result
}

/**
 * Generate sample CSV templates
 */
export function getHoldingsCSVTemplate(): string {
  return `Symbol,Name,Asset Type,Quantity,Cost Basis,Currency
AAPL,Apple Inc.,Stock,100,15000,USD
GOOGL,Alphabet Inc.,Stock,50,7500,USD
VTI,Vanguard Total Stock Market ETF,ETF,200,40000,USD
BTC,Bitcoin,Crypto,0.5,20000,USD`
}

export function getTransactionsCSVTemplate(): string {
  return `Date,Type,Symbol,Quantity,Price,Amount,Fees,Notes
2024-01-15,Buy,AAPL,10,150.00,1500.00,5.00,Initial purchase
2024-02-01,Buy,GOOGL,5,140.00,700.00,5.00,Adding to position
2024-03-01,Dividend,AAPL,,,,15.00,Q1 dividend
2024-03-15,Sell,AAPL,5,160.00,800.00,5.00,Partial sale`
}
