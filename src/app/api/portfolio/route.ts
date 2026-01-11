import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  createPortfolio,
  getUserPortfolios,
} from "@/lib/portfolio/portfolio-service"
import { canCreatePortfolio } from "@/lib/portfolio/access"
import { demoGuard } from "@/lib/demo/demo-guard"

/**
 * GET /api/portfolio
 * List all portfolios for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    const { portfolios, total } = await getUserPortfolios(session.user.id, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    return NextResponse.json({ portfolios, total })
  } catch (error) {
    console.error("Error fetching portfolios:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio
 * Create a new portfolio
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from creating portfolios
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    // Check if user can create more portfolios
    const { allowed, current, limit, tier } = await canCreatePortfolio(
      session.user.id
    )

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Portfolio limit reached. Your ${tier} plan allows ${limit} portfolio(s). Upgrade to create more.`,
          code: "LIMIT_REACHED",
          current,
          limit,
          tier,
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, isDefault, baseCurrency } = body

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Portfolio name is required" },
        { status: 400 }
      )
    }

    const portfolio = await createPortfolio({
      userId: session.user.id,
      name: name.trim(),
      description: description?.trim(),
      isDefault,
      baseCurrency: baseCurrency || "USD",
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error: any) {
    console.error("Error creating portfolio:", error)
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 }
    )
  }
}
