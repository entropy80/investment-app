import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  getPortfolioSummary,
} from "@/lib/portfolio/portfolio-service"
import { demoGuard } from "@/lib/demo/demo-guard"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]
 * Get a specific portfolio with all accounts and holdings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const portfolio = await getPortfolioById(id, session.user.id)

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    // Also get summary data
    const summary = await getPortfolioSummary(id, session.user.id)

    return NextResponse.json({ portfolio, summary })
  } catch (error) {
    console.error("Error fetching portfolio:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/portfolio/[id]
 * Update a portfolio
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from updating portfolios
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { id } = await params
    const body = await request.json()
    const { name, description, isDefault, baseCurrency } = body

    // Validation
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Portfolio name cannot be empty" },
        { status: 400 }
      )
    }

    const portfolio = await updatePortfolio(id, session.user.id, {
      name: name?.trim(),
      description: description?.trim(),
      isDefault,
      baseCurrency,
    })

    return NextResponse.json(portfolio)
  } catch (error: any) {
    console.error("Error updating portfolio:", error)

    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]
 * Delete a portfolio
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from deleting portfolios
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { id } = await params
    await deletePortfolio(id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting portfolio:", error)

    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete portfolio" },
      { status: 500 }
    )
  }
}
