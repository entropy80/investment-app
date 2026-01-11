import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { demoGuard } from "@/lib/demo/demo-guard"
import {
  getBudgetForYear,
  hasBudgetForYear,
  initializeBudgetForYear,
  getBudgetYears,
} from "@/lib/budget/budget-service"

/**
 * GET /api/budget
 * Get budget data for a specific year
 * Query params: year (required)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get("year")

    if (!yearParam) {
      return NextResponse.json(
        { error: "Year parameter is required" },
        { status: 400 }
      )
    }

    const year = parseInt(yearParam)
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Invalid year parameter" },
        { status: 400 }
      )
    }

    const budget = await getBudgetForYear(session.user.id, year)
    const years = await getBudgetYears(session.user.id)

    return NextResponse.json({
      budget,
      exists: budget !== null,
      availableYears: years,
    })
  } catch (error) {
    console.error("Error fetching budget:", error)
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/budget
 * Initialize a new budget for a year with template categories
 * Body: { year: number, currency?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from creating budgets
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const body = await request.json()
    const { year, currency = "USD" } = body

    // Validation
    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "Year is required and must be a number" },
        { status: 400 }
      )
    }

    if (year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Year must be between 2000 and 2100" },
        { status: 400 }
      )
    }

    // Check if budget already exists for this year
    const exists = await hasBudgetForYear(session.user.id, year)
    if (exists) {
      return NextResponse.json(
        { error: `Budget for ${year} already exists` },
        { status: 409 }
      )
    }

    // Initialize budget with template categories
    const result = await initializeBudgetForYear(
      session.user.id,
      year,
      currency
    )

    return NextResponse.json(
      {
        success: true,
        year,
        categoriesCreated: result.categoriesCreated,
        itemsCreated: result.itemsCreated,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating budget:", error)
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    )
  }
}
