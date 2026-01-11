/**
 * Batch Price Refresh Service
 * Handles scheduled price updates for all portfolios
 * Respects API rate limits and prioritizes recently active users
 */

import { prisma } from "@/lib/prisma"
import { refreshAccountPrices, PriceResult } from "./fmp-service"

// Rate limit configuration
const DELAY_BETWEEN_ACCOUNTS_MS = 2000 // 2 seconds between accounts to respect rate limits
const MAX_PORTFOLIOS_PER_RUN = 50 // Limit portfolios per cron run

export interface BatchRefreshResult {
  portfoliosProcessed: number
  accountsProcessed: number
  pricesUpdated: number
  pricesErrored: number
  pricesSkipped: number
  startTime: Date
  endTime: Date
  duration: number // milliseconds
  details: PortfolioRefreshResult[]
}

export interface PortfolioRefreshResult {
  portfolioId: string
  portfolioName: string
  userId: string
  accountsProcessed: number
  pricesUpdated: number
  pricesErrored: number
  pricesSkipped: number
  error?: string
}

/**
 * Refresh prices for all active portfolios
 * Prioritizes portfolios that haven't been refreshed recently
 */
export async function batchRefreshAllPrices(): Promise<BatchRefreshResult> {
  const startTime = new Date()
  const details: PortfolioRefreshResult[] = []

  // Get portfolios ordered by last refresh (oldest first, nulls first)
  const portfolios = await prisma.portfolio.findMany({
    where: {
      accounts: {
        some: {
          holdings: {
            some: {
              quantity: { gt: 0 },
            },
          },
        },
      },
    },
    orderBy: [
      { lastPriceRefresh: "asc" }, // Nulls come first in asc order
    ],
    take: MAX_PORTFOLIOS_PER_RUN,
    select: {
      id: true,
      name: true,
      userId: true,
      accounts: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  let totalUpdated = 0
  let totalErrors = 0
  let totalSkipped = 0
  let accountsProcessed = 0

  for (const portfolio of portfolios) {
    const portfolioResult: PortfolioRefreshResult = {
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      userId: portfolio.userId,
      accountsProcessed: 0,
      pricesUpdated: 0,
      pricesErrored: 0,
      pricesSkipped: 0,
    }

    try {
      for (const account of portfolio.accounts) {
        // Delay between accounts to respect rate limits
        if (accountsProcessed > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_ACCOUNTS_MS)
          )
        }

        const result = await refreshAccountPrices(account.id)

        portfolioResult.accountsProcessed++
        portfolioResult.pricesUpdated += result.updated
        portfolioResult.pricesErrored += result.errors
        portfolioResult.pricesSkipped += result.skipped

        accountsProcessed++
      }

      // Update lastPriceRefresh timestamp
      await prisma.portfolio.update({
        where: { id: portfolio.id },
        data: { lastPriceRefresh: new Date() },
      })

      totalUpdated += portfolioResult.pricesUpdated
      totalErrors += portfolioResult.pricesErrored
      totalSkipped += portfolioResult.pricesSkipped
    } catch (error) {
      portfolioResult.error =
        error instanceof Error ? error.message : "Unknown error"
      console.error(
        `Error refreshing portfolio ${portfolio.id}:`,
        portfolioResult.error
      )
    }

    details.push(portfolioResult)
  }

  const endTime = new Date()

  return {
    portfoliosProcessed: portfolios.length,
    accountsProcessed,
    pricesUpdated: totalUpdated,
    pricesErrored: totalErrors,
    pricesSkipped: totalSkipped,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    details,
  }
}

/**
 * Refresh prices for a single portfolio and update lastPriceRefresh
 */
export async function refreshPortfolioPricesWithTimestamp(
  portfolioId: string
): Promise<{
  updated: number
  errors: number
  skipped: number
  results: PriceResult[]
}> {
  // Get portfolio accounts
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    select: {
      accounts: {
        select: { id: true },
      },
    },
  })

  if (!portfolio) {
    throw new Error("Portfolio not found")
  }

  let totalUpdated = 0
  let totalErrors = 0
  let totalSkipped = 0
  const allResults: PriceResult[] = []

  for (const account of portfolio.accounts) {
    const result = await refreshAccountPrices(account.id)
    totalUpdated += result.updated
    totalErrors += result.errors
    totalSkipped += result.skipped
    allResults.push(...result.results)
  }

  // Update lastPriceRefresh timestamp
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { lastPriceRefresh: new Date() },
  })

  return {
    updated: totalUpdated,
    errors: totalErrors,
    skipped: totalSkipped,
    results: allResults,
  }
}

/**
 * Get portfolios that need price refresh
 * Returns portfolios where lastPriceRefresh is null or older than threshold
 */
export async function getPortfoliosNeedingRefresh(
  hoursThreshold: number = 4
): Promise<
  Array<{
    id: string
    name: string
    userId: string
    lastPriceRefresh: Date | null
  }>
> {
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold)

  return prisma.portfolio.findMany({
    where: {
      OR: [
        { lastPriceRefresh: null },
        { lastPriceRefresh: { lt: thresholdDate } },
      ],
      accounts: {
        some: {
          holdings: {
            some: {
              quantity: { gt: 0 },
            },
          },
        },
      },
    },
    orderBy: { lastPriceRefresh: "asc" },
    select: {
      id: true,
      name: true,
      userId: true,
      lastPriceRefresh: true,
    },
  })
}
