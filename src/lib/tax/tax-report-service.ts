/**
 * Tax Report Service
 *
 * Generates IRS Form 8949 and Schedule D reports from realized gains data.
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  Form8949Row,
  Form8949Report,
  ScheduleDSummary,
  TaxReport,
  TaxReportOptions,
} from "./types"

/**
 * Generate a complete tax report for a portfolio
 */
export async function generateTaxReport(
  portfolioId: string,
  userId: string,
  options: TaxReportOptions
): Promise<TaxReport | null> {
  // Verify portfolio ownership
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: { accounts: { select: { id: true } } },
  })

  if (!portfolio) {
    return null
  }

  const accountIds = portfolio.accounts.map((a) => a.id)
  const { year, includeZeroGains = false } = options

  // Get all SELL transactions with realized gains for the year
  const dateFilter: Prisma.PortfolioTransactionWhereInput = {
    date: {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    },
  }

  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: "SELL",
      realizedGainLoss: includeZeroGains ? undefined : { not: null },
      ...dateFilter,
    },
    include: {
      holding: {
        select: {
          symbol: true,
          name: true,
        },
      },
    },
    orderBy: { date: "asc" },
  })

  // Build Form 8949 rows
  const partI: Form8949Row[] = [] // Short-term
  const partII: Form8949Row[] = [] // Long-term

  for (const tx of transactions) {
    if (!tx.holding || tx.realizedGainLoss === null) continue

    const quantity = Number(tx.quantity || 0)
    const proceeds = Number(tx.amount || 0)
    const costBasis = Number(tx.costBasisUsed || 0)
    const gainOrLoss = Number(tx.realizedGainLoss)
    const holdingPeriodDays = tx.holdingPeriodDays || 0

    // Skip zero gains if not requested
    if (!includeZeroGains && gainOrLoss === 0) continue

    // Calculate date acquired from holding period
    const dateSold = tx.date
    const dateAcquired = new Date(dateSold)
    dateAcquired.setDate(dateAcquired.getDate() - holdingPeriodDays)

    const row: Form8949Row = {
      description: `${quantity} sh ${tx.holding.symbol}`,
      dateAcquired,
      dateSold,
      proceeds: Math.abs(proceeds), // Proceeds should be positive
      costBasis,
      gainOrLoss,
      symbol: tx.holding.symbol,
      quantity,
      holdingPeriodDays,
      transactionId: tx.id,
    }

    // Short-term: held 365 days or less
    // Long-term: held more than 365 days
    if (holdingPeriodDays <= 365) {
      partI.push(row)
    } else {
      partII.push(row)
    }
  }

  // Calculate summaries
  const shortTermProceeds = partI.reduce((sum, r) => sum + r.proceeds, 0)
  const shortTermCostBasis = partI.reduce((sum, r) => sum + r.costBasis, 0)
  const shortTermGainLoss = partI.reduce((sum, r) => sum + r.gainOrLoss, 0)

  const longTermProceeds = partII.reduce((sum, r) => sum + r.proceeds, 0)
  const longTermCostBasis = partII.reduce((sum, r) => sum + r.costBasis, 0)
  const longTermGainLoss = partII.reduce((sum, r) => sum + r.gainOrLoss, 0)

  const form8949: Form8949Report = {
    year,
    partI,
    partII,
    summary: {
      shortTermProceeds,
      shortTermCostBasis,
      shortTermGainLoss,
      longTermProceeds,
      longTermCostBasis,
      longTermGainLoss,
      totalProceeds: shortTermProceeds + longTermProceeds,
      totalCostBasis: shortTermCostBasis + longTermCostBasis,
      totalGainLoss: shortTermGainLoss + longTermGainLoss,
    },
  }

  // Generate Schedule D summary
  // For simplicity, we put all transactions in Box A (short-term) or Box D (long-term)
  // These are for transactions reported on 1099-B with basis reported to IRS
  const scheduleD: ScheduleDSummary = {
    year,
    line1a: shortTermGainLoss, // Box A short-term
    line1b: 0, // Box B (not used)
    line2: 0, // Box C (not used)
    line7: shortTermGainLoss, // Net short-term
    line8a: longTermGainLoss, // Box D long-term
    line8b: 0, // Box E (not used)
    line9: 0, // Box F (not used)
    line15: longTermGainLoss, // Net long-term
    line16: shortTermGainLoss + longTermGainLoss, // Combined
  }

  return {
    portfolioId,
    portfolioName: portfolio.name,
    year,
    generatedAt: new Date(),
    form8949,
    scheduleD,
    transactionCount: partI.length + partII.length,
    shortTermCount: partI.length,
    longTermCount: partII.length,
  }
}

/**
 * Format a date as MM/DD/YYYY for IRS forms
 */
export function formatIRSDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Format currency for IRS forms (no $ sign, commas for thousands)
 */
export function formatIRSCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Generate CSV export for Form 8949
 * Compatible with TurboTax and H&R Block import
 */
export function generateForm8949CSV(report: TaxReport): string {
  const headers = [
    "Description",
    "Date Acquired",
    "Date Sold",
    "Proceeds",
    "Cost Basis",
    "Adjustment Code",
    "Adjustment Amount",
    "Gain or Loss",
    "Term",
  ]

  const rows: string[][] = []

  // Add short-term transactions (Part I)
  for (const row of report.form8949.partI) {
    rows.push([
      row.description,
      formatIRSDate(row.dateAcquired),
      formatIRSDate(row.dateSold),
      formatIRSCurrency(row.proceeds),
      formatIRSCurrency(row.costBasis),
      row.adjustmentCode || "",
      row.adjustmentAmount ? formatIRSCurrency(row.adjustmentAmount) : "",
      formatIRSCurrency(row.gainOrLoss),
      "Short-term",
    ])
  }

  // Add long-term transactions (Part II)
  for (const row of report.form8949.partII) {
    rows.push([
      row.description,
      formatIRSDate(row.dateAcquired),
      formatIRSDate(row.dateSold),
      formatIRSCurrency(row.proceeds),
      formatIRSCurrency(row.costBasis),
      row.adjustmentCode || "",
      row.adjustmentAmount ? formatIRSCurrency(row.adjustmentAmount) : "",
      formatIRSCurrency(row.gainOrLoss),
      "Long-term",
    ])
  }

  // Build CSV string
  const csvRows = [headers.join(",")]
  for (const row of rows) {
    // Escape fields that contain commas or quotes
    const escapedRow = row.map((field) => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    })
    csvRows.push(escapedRow.join(","))
  }

  // Add summary section
  csvRows.push("")
  csvRows.push("Summary")
  csvRows.push(`Short-term Proceeds,${formatIRSCurrency(report.form8949.summary.shortTermProceeds)}`)
  csvRows.push(`Short-term Cost Basis,${formatIRSCurrency(report.form8949.summary.shortTermCostBasis)}`)
  csvRows.push(`Short-term Gain/Loss,${formatIRSCurrency(report.form8949.summary.shortTermGainLoss)}`)
  csvRows.push("")
  csvRows.push(`Long-term Proceeds,${formatIRSCurrency(report.form8949.summary.longTermProceeds)}`)
  csvRows.push(`Long-term Cost Basis,${formatIRSCurrency(report.form8949.summary.longTermCostBasis)}`)
  csvRows.push(`Long-term Gain/Loss,${formatIRSCurrency(report.form8949.summary.longTermGainLoss)}`)
  csvRows.push("")
  csvRows.push(`Total Gain/Loss,${formatIRSCurrency(report.form8949.summary.totalGainLoss)}`)

  return csvRows.join("\n")
}

/**
 * Get available years with realized gains for a portfolio
 */
export async function getTaxYears(
  portfolioId: string,
  userId: string
): Promise<number[]> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: { accounts: { select: { id: true } } },
  })

  if (!portfolio) {
    return []
  }

  const accountIds = portfolio.accounts.map((a) => a.id)

  // Get distinct years from SELL transactions
  const transactions = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: "SELL",
      realizedGainLoss: { not: null },
    },
    select: { date: true },
    distinct: ["date"],
  })

  const years = new Set<number>()
  for (const tx of transactions) {
    years.add(tx.date.getFullYear())
  }

  return Array.from(years).sort((a, b) => b - a) // Descending order
}
