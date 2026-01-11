import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  calculatePerformanceMetrics,
  calculateHoldingPerformance,
  calculateDividendSummary,
  calculateAllocation,
  getPortfolioHistory,
  compareToBenchmark,
  calculateRealizedGains,
  calculateBankSummary,
} from "@/lib/portfolio/analytics"
import { validatePortfolioAccess } from "@/lib/portfolio/access"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/analytics
 * Get analytics data for a portfolio
 *
 * Query params:
 * - type: 'performance' | 'holdings' | 'dividends' | 'allocation' | 'history' | 'benchmark' | 'tax'
 * - period: '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL'
 * - benchmark: 'SP500' | 'NASDAQ' | 'DOW'
 * - year: number (for tax reports)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params
    const searchParams = request.nextUrl.searchParams

    const type = searchParams.get("type") || "performance"
    const period = (searchParams.get("period") || "1Y") as "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL"
    const benchmark = (searchParams.get("benchmark") || "SP500") as "SP500" | "NASDAQ" | "DOW"
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()

    // Check feature access for premium analytics
    const premiumFeatures = ["dividends", "benchmark", "tax"]
    if (premiumFeatures.includes(type)) {
      const featureMap: Record<string, any> = {
        dividends: "dividend_tracking",
        benchmark: "benchmarking",
        tax: "tax_reports",
      }

      const { allowed, tier, requiredTier } = await validatePortfolioAccess(
        session.user.id,
        featureMap[type]
      )

      if (!allowed) {
        return NextResponse.json(
          {
            error: `This feature requires a ${requiredTier} subscription`,
            code: "FEATURE_LOCKED",
            tier,
            requiredTier,
          },
          { status: 403 }
        )
      }
    }

    let data: any = null

    switch (type) {
      case "performance":
        data = await calculatePerformanceMetrics(portfolioId, session.user.id)
        break

      case "holdings":
        data = await calculateHoldingPerformance(portfolioId, session.user.id)
        break

      case "dividends":
        data = await calculateDividendSummary(portfolioId, session.user.id, year)
        break

      case "allocation":
        data = await calculateAllocation(portfolioId, session.user.id)
        break

      case "history":
        data = await getPortfolioHistory(portfolioId, session.user.id, period)
        break

      case "benchmark":
        data = await compareToBenchmark(
          portfolioId,
          session.user.id,
          benchmark,
          period as "1M" | "3M" | "6M" | "1Y" | "YTD"
        )
        break

      case "tax":
        data = await calculateRealizedGains(portfolioId, session.user.id, year)
        break

      case "bank_summary":
        data = await calculateBankSummary(portfolioId, session.user.id)
        break

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 }
        )
    }

    if (data === null) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ type, data })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
