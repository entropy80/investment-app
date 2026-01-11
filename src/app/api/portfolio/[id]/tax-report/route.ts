import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  generateTaxReport,
  generateForm8949CSV,
  getTaxYears,
} from "@/lib/tax"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/tax-report
 * Generate tax report for a portfolio
 *
 * Query params:
 * - year: Tax year (required, e.g., 2025)
 * - format: 'json' | 'csv' (default: json)
 * - action: 'years' to get available years with data
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

    // Get available years
    if (action === "years") {
      const years = await getTaxYears(portfolioId, session.user.id)
      return NextResponse.json({ years })
    }

    // Generate tax report
    const yearParam = searchParams.get("year")
    if (!yearParam) {
      return NextResponse.json(
        { error: "Year parameter is required" },
        { status: 400 }
      )
    }

    const year = parseInt(yearParam)
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { error: "Invalid year" },
        { status: 400 }
      )
    }

    const format = searchParams.get("format") || "json"
    const includeZeroGains = searchParams.get("includeZeroGains") === "true"

    const report = await generateTaxReport(portfolioId, session.user.id, {
      year,
      includeZeroGains,
    })

    if (!report) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    // Return CSV format
    if (format === "csv") {
      const csv = generateForm8949CSV(report)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="Form8949_${report.portfolioName}_${year}.csv"`,
        },
      })
    }

    // Return JSON format
    return NextResponse.json(report)
  } catch (error) {
    console.error("Error generating tax report:", error)
    return NextResponse.json(
      { error: "Failed to generate tax report" },
      { status: 500 }
    )
  }
}
