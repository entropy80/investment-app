/**
 * Tax Report Types
 *
 * Data structures for IRS Form 8949 and Schedule D tax reports.
 */

/**
 * A single row in Form 8949
 * Represents one sale transaction
 */
export interface Form8949Row {
  // Column (a): Description of property (e.g., "100 sh AAPL")
  description: string

  // Column (b): Date acquired (MM/DD/YYYY)
  dateAcquired: Date

  // Column (c): Date sold (MM/DD/YYYY)
  dateSold: Date

  // Column (d): Proceeds (sales price)
  proceeds: number

  // Column (e): Cost or other basis
  costBasis: number

  // Column (f): Adjustment code (usually empty for simple trades)
  adjustmentCode?: string

  // Column (g): Adjustment amount
  adjustmentAmount?: number

  // Column (h): Gain or (loss) = proceeds - costBasis + adjustmentAmount
  gainOrLoss: number

  // Additional metadata for display
  symbol: string
  quantity: number
  holdingPeriodDays: number
  transactionId: string
}

/**
 * Form 8949 Report
 * Part I: Short-term capital gains (held 1 year or less)
 * Part II: Long-term capital gains (held more than 1 year)
 */
export interface Form8949Report {
  year: number

  // Part I: Short-term transactions (Box A, B, or C)
  partI: Form8949Row[]

  // Part II: Long-term transactions (Box D, E, or F)
  partII: Form8949Row[]

  // Summary totals
  summary: {
    // Part I totals (short-term)
    shortTermProceeds: number
    shortTermCostBasis: number
    shortTermGainLoss: number

    // Part II totals (long-term)
    longTermProceeds: number
    longTermCostBasis: number
    longTermGainLoss: number

    // Combined
    totalProceeds: number
    totalCostBasis: number
    totalGainLoss: number
  }
}

/**
 * Schedule D Summary
 * Capital Gains and Losses summary for Schedule D
 */
export interface ScheduleDSummary {
  year: number

  // Part I: Short-Term Capital Gains and Losses
  // Line 1a: Totals from Form 8949, Part I, Box A
  line1a: number
  // Line 1b: Totals from Form 8949, Part I, Box B
  line1b: number
  // Line 2: Totals from Form 8949, Part I, Box C
  line2: number
  // Line 7: Net short-term capital gain or (loss)
  line7: number

  // Part II: Long-Term Capital Gains and Losses
  // Line 8a: Totals from Form 8949, Part II, Box D
  line8a: number
  // Line 8b: Totals from Form 8949, Part II, Box E
  line8b: number
  // Line 9: Totals from Form 8949, Part II, Box F
  line9: number
  // Line 15: Net long-term capital gain or (loss)
  line15: number

  // Summary
  // Line 16: Combine lines 7 and 15
  line16: number
}

/**
 * Complete Tax Report with all forms
 */
export interface TaxReport {
  portfolioId: string
  portfolioName: string
  year: number
  generatedAt: Date

  form8949: Form8949Report
  scheduleD: ScheduleDSummary

  // Metadata
  transactionCount: number
  shortTermCount: number
  longTermCount: number
}

/**
 * Tax report generation options
 */
export interface TaxReportOptions {
  year: number
  format?: 'json' | 'csv'
  includeZeroGains?: boolean
}
