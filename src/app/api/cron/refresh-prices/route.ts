/**
 * Cron endpoint for scheduled price refresh
 *
 * This endpoint is called by Vercel Cron or an external scheduler
 * to periodically refresh prices for all portfolios.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Usage:
 *   GET /api/cron/refresh-prices
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { batchRefreshAllPrices, BatchRefreshResult } from "@/lib/prices/batch-refresh"

// Allow longer execution time for cron jobs
export const maxDuration = 300 // 5 minutes

// Disable edge runtime for database access
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - MANDATORY for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // CRON_SECRET must be configured - no bypass allowed
    if (!cronSecret) {
      console.error("Cron: CRON_SECRET environment variable is not configured")
      return NextResponse.json(
        { error: "Server configuration error: CRON_SECRET not set" },
        { status: 500 }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.log("Cron: Unauthorized request - invalid or missing authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Cron: Starting batch price refresh...")

    const result = await batchRefreshAllPrices()

    console.log(`Cron: Completed. Portfolios: ${result.portfoliosProcessed}, Updated: ${result.pricesUpdated}, Errors: ${result.pricesErrored}, Duration: ${result.duration}ms`)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Cron: Error during batch refresh:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers or different schedulers
export async function POST(request: NextRequest) {
  return GET(request)
}
