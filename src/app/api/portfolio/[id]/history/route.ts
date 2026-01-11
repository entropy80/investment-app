import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getPortfolioHistory,
  getPerformanceMetrics,
  createTodaySnapshot,
  getLatestSnapshot,
} from "@/lib/portfolio/snapshot-service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/history
 * Get portfolio value history for charting
 *
 * Query params:
 * - period: '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL' (default: '1Y')
 * - action: 'snapshot' to create today's snapshot
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params
    const searchParams = request.nextUrl.searchParams

    const action = searchParams.get("action")

    // Create today's snapshot
    if (action === "snapshot") {
      await createTodaySnapshot(portfolioId, session.user.id)
      return NextResponse.json({ success: true, message: "Snapshot created" })
    }

    // Get latest snapshot info
    if (action === "latest") {
      const latest = await getLatestSnapshot(portfolioId)
      return NextResponse.json({ snapshot: latest })
    }

    // Get history for charting
    const period = (searchParams.get("period") || "1Y") as
      | "1M"
      | "3M"
      | "6M"
      | "1Y"
      | "YTD"
      | "ALL"

    const history = await getPortfolioHistory(portfolioId, session.user.id, period)

    if (!history) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    // Calculate performance metrics for the period
    let performance = null
    if (history.dataPoints.length >= 2) {
      performance = await getPerformanceMetrics(
        portfolioId,
        history.startDate,
        history.endDate
      )
    }

    return NextResponse.json({
      period,
      startDate: history.startDate,
      endDate: history.endDate,
      dataPoints: history.dataPoints,
      performance,
      count: history.dataPoints.length,
    })
  } catch (error) {
    console.error("Error fetching portfolio history:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio history" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/[id]/history
 * Create a snapshot for today
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params

    await createTodaySnapshot(portfolioId, session.user.id)

    return NextResponse.json({
      success: true,
      message: "Snapshot created for today",
    })
  } catch (error: any) {
    console.error("Error creating snapshot:", error)

    if (error.message === "Portfolio not found") {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create snapshot" },
      { status: 500 }
    )
  }
}
