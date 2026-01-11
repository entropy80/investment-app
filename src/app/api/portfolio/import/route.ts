import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  importHoldings,
  importTransactions as importGenericTransactions,
  getHoldingsCSVTemplate,
  getTransactionsCSVTemplate,
} from "@/lib/portfolio/csv-import"
import {
  importTransactions as importBrokerTransactions,
  detectBrokerFormat,
  getImportHistory,
  rollbackImport,
  type BrokerFormat,
} from "@/lib/import"
import { validatePortfolioAccess } from "@/lib/portfolio/access"
import { demoGuard } from "@/lib/demo/demo-guard"

/**
 * GET /api/portfolio/import
 * Get CSV templates or import history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")
    const accountId = searchParams.get("accountId")

    // Get import history for an account
    if (action === "history" && accountId) {
      const history = await getImportHistory(accountId)
      return NextResponse.json({ history })
    }

    // Get CSV templates (default behavior)
    const type = searchParams.get("type") || "holdings"

    const template =
      type === "transactions"
        ? getTransactionsCSVTemplate()
        : getHoldingsCSVTemplate()

    return NextResponse.json({
      type,
      template,
      instructions:
        type === "transactions"
          ? "Import transaction history with columns: Date, Type, Symbol, Quantity, Price, Amount, Fees, Notes"
          : "Import holdings with columns: Symbol, Name, Asset Type, Quantity, Cost Basis, Currency",
      brokerFormats: ["schwab", "ibkr"],
    })
  } catch (error) {
    console.error("Error getting template:", error)
    return NextResponse.json(
      { error: "Failed to get template" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/import
 * Import holdings or transactions from CSV
 *
 * Body:
 * - accountId: string (required)
 * - type: 'holdings' | 'transactions' | 'broker' (required)
 * - csvContent: string (required)
 * - brokerFormat: 'schwab' | 'ibkr' | 'auto' (optional, for type='broker')
 * - dryRun: boolean (optional, preview without importing)
 * - currency: string (optional, currency code for transactions, defaults to 'USD')
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from importing data
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    // Check if user has CSV import feature access
    const { allowed, tier, requiredTier } = await validatePortfolioAccess(
      session.user.id,
      "csv_import"
    )

    if (!allowed) {
      return NextResponse.json(
        {
          error: `CSV import requires a ${requiredTier} subscription`,
          code: "FEATURE_LOCKED",
          tier,
          requiredTier,
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { accountId, type, csvContent, brokerFormat, dryRun, currency } = body

    // Validation
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    if (!type || !["holdings", "transactions", "broker"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'holdings', 'transactions', or 'broker'" },
        { status: 400 }
      )
    }

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "CSV content is required" },
        { status: 400 }
      )
    }

    // File size limit: 10MB max
    const MAX_CSV_SIZE = 10 * 1024 * 1024 // 10MB in bytes
    const csvSizeBytes = new TextEncoder().encode(csvContent).length
    if (csvSizeBytes > MAX_CSV_SIZE) {
      return NextResponse.json(
        {
          error: `CSV file too large. Maximum size is 10MB, received ${(csvSizeBytes / (1024 * 1024)).toFixed(2)}MB`,
        },
        { status: 413 }
      )
    }

    // Handle broker-specific import (Schwab, IBKR)
    if (type === "broker") {
      let format: BrokerFormat | null = null

      // Use provided format or auto-detect
      if (brokerFormat && brokerFormat !== "auto") {
        format = brokerFormat as BrokerFormat
      } else {
        format = detectBrokerFormat(csvContent)
      }

      if (!format) {
        return NextResponse.json(
          {
            error: "Could not detect broker format. Please specify brokerFormat: 'schwab' or 'ibkr'",
          },
          { status: 400 }
        )
      }

      const result = await importBrokerTransactions(csvContent, {
        accountId,
        brokerFormat: format,
        dryRun: dryRun ?? false,
        skipDuplicates: true,
        currency: currency || "USD",
      })

      return NextResponse.json({
        success: result.errors === 0,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        total: result.total,
        importBatch: result.importBatch,
        brokerFormat: format,
        dryRun: dryRun ?? false,
        message: dryRun
          ? `Preview: ${result.imported} would be imported, ${result.skipped} would be skipped.`
          : `Successfully imported ${result.imported} transactions from ${format}. ${result.skipped} skipped.`,
        details: result.results.slice(0, 20).map((r) => ({
          date: r.transaction.date,
          type: r.transaction.type,
          symbol: r.transaction.symbol,
          amount: r.transaction.amount,
          status: r.status,
          reason: r.reason,
        })),
      })
    }

    // Handle generic import (existing behavior)
    const result =
      type === "transactions"
        ? await importGenericTransactions(accountId, session.user.id, csvContent)
        : await importHoldings(accountId, session.user.id, csvContent)

    if (!result.success && result.errors.length > 0 && result.imported === 0) {
      return NextResponse.json(
        {
          error: "Import failed",
          details: result.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.slice(0, 10),
      message: `Successfully imported ${result.imported} ${type}. ${result.skipped} skipped.`,
    })
  } catch (error) {
    console.error("Error importing data:", error)
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/import
 * Rollback an import batch
 *
 * Body:
 * - batchId: string (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from rolling back imports
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const body = await request.json()
    const { batchId } = body

    if (!batchId) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      )
    }

    const deletedCount = await rollbackImport(batchId)

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: `Rolled back ${deletedCount} transactions from batch ${batchId}`,
    })
  } catch (error) {
    console.error("Error rolling back import:", error)
    return NextResponse.json(
      { error: "Failed to rollback import" },
      { status: 500 }
    )
  }
}
