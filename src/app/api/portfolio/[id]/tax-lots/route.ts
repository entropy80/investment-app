import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  backfillTaxLotsForPortfolio,
  getPortfolioRealizedGains,
  getTaxLotsForHolding,
} from "@/lib/portfolio/tax-lot-service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/tax-lots
 * Get realized gains summary or tax lots for a holding
 *
 * Query params:
 * - action: "realized-gains" | "holding-lots"
 * - holdingId: Required for "holding-lots"
 * - year: Filter by year (for realized gains)
 * - startDate: Start date filter
 * - endDate: End date filter
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action") || "realized-gains"

    if (action === "holding-lots") {
      const holdingId = searchParams.get("holdingId")
      if (!holdingId) {
        return NextResponse.json(
          { error: "holdingId is required" },
          { status: 400 }
        )
      }

      const taxLots = await getTaxLotsForHolding(holdingId)
      return NextResponse.json({ taxLots })
    }

    // Default: realized-gains
    const year = searchParams.get("year")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const result = await getPortfolioRealizedGains(
      portfolioId,
      session.user.id,
      {
        year: year ? parseInt(year) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching tax lot data:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Portfolio not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch tax lot data" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/[id]/tax-lots
 * Backfill tax lots for existing transactions
 *
 * Body:
 * - action: "backfill" (required)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params
    const body = await request.json()
    const { action } = body

    if (action !== "backfill") {
      return NextResponse.json(
        { error: "Invalid action. Use 'backfill'" },
        { status: 400 }
      )
    }

    const result = await backfillTaxLotsForPortfolio(portfolioId, session.user.id)

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${result.created} tax lots created, ${result.consumed} SELL transactions processed`,
      ...result,
    })
  } catch (error: any) {
    console.error("Error processing tax lots:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Portfolio not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to process tax lots" },
      { status: 500 }
    )
  }
}
