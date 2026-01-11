import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  createHolding,
  updateHolding,
  deleteHolding,
  getHoldingById,
  getPortfolioById,
} from "@/lib/portfolio/portfolio-service"
import { AssetType } from "@prisma/client"
import { demoGuard } from "@/lib/demo/demo-guard"
import { prisma } from "@/lib/prisma"

// Valid currency codes for CASH holdings
const VALID_CASH_CURRENCIES = ["USD", "EUR", "GBP", "KWD", "CHF"]

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/holdings
 * List all holdings across all accounts in a portfolio
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

    // Flatten holdings from all accounts
    const holdings = portfolio.accounts.flatMap((account) =>
      account.holdings.map((holding) => ({
        ...holding,
        accountName: account.name,
        accountId: account.id,
      }))
    )

    return NextResponse.json({
      holdings,
      total: holdings.length,
    })
  } catch (error) {
    console.error("Error fetching holdings:", error)
    return NextResponse.json(
      { error: "Failed to fetch holdings" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/[id]/holdings
 * Create a new holding in an account
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from creating holdings
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const body = await request.json()
    const {
      accountId,
      symbol,
      name,
      assetType,
      quantity,
      costBasis,
      avgCostPerUnit,
      currency,
      notes,
    } = body

    // Validation
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      )
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    if (!assetType || !Object.values(AssetType).includes(assetType)) {
      return NextResponse.json(
        { error: "Valid asset type is required" },
        { status: 400 }
      )
    }

    if (quantity === undefined || typeof quantity !== "number" || quantity < 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      )
    }

    // Normalize symbol for validation
    const normalizedSymbol = symbol.trim().toUpperCase()

    // CASH asset type validation
    if (assetType === "CASH") {
      // Enforce CASH.XXX format
      if (!normalizedSymbol.startsWith("CASH.")) {
        return NextResponse.json(
          {
            error: "Cash holdings must use format CASH.{CURRENCY}, e.g., CASH.USD, CASH.EUR",
            hint: "Select a currency code like USD, EUR, GBP, KWD, or CHF"
          },
          { status: 400 }
        )
      }

      // Extract and validate currency code
      const currencyCode = normalizedSymbol.split(".")[1]
      if (!currencyCode || currencyCode.length < 2) {
        return NextResponse.json(
          {
            error: "Invalid cash symbol format. Expected CASH.{CURRENCY}",
            hint: "Example: CASH.USD, CASH.EUR, CASH.GBP"
          },
          { status: 400 }
        )
      }

      // Validate currency exists in database
      const currencyExists = await prisma.currency.findUnique({
        where: { code: currencyCode },
      })

      if (!currencyExists) {
        return NextResponse.json(
          {
            error: `Currency '${currencyCode}' not found`,
            hint: `Valid currencies: ${VALID_CASH_CURRENCIES.join(", ")}`,
            validCurrencies: VALID_CASH_CURRENCIES
          },
          { status: 400 }
        )
      }
    }

    // Prevent CASH. prefix for non-CASH asset types
    if (normalizedSymbol.startsWith("CASH.") && assetType !== "CASH") {
      return NextResponse.json(
        {
          error: "Symbols starting with 'CASH.' must have asset type 'Cash'",
          hint: "Change the asset type to 'Cash' or use a different symbol"
        },
        { status: 400 }
      )
    }

    // Track the final symbol (may be modified for CRYPTO)
    let finalSymbol = normalizedSymbol

    // STOCK, ETF, MUTUAL_FUND, BOND symbol validation
    if (["STOCK", "ETF", "MUTUAL_FUND", "BOND"].includes(assetType)) {
      // Allow letters, numbers, dots, and hyphens (some symbols like BRK.B, BF-B)
      if (!/^[A-Z0-9.\-]+$/.test(normalizedSymbol)) {
        return NextResponse.json(
          {
            error: "Invalid ticker symbol format",
            hint: "Use uppercase letters, numbers, dots, or hyphens only (e.g., AAPL, BRK.B)"
          },
          { status: 400 }
        )
      }

      // Max length check (most tickers are 1-5 chars, but some can be longer)
      if (normalizedSymbol.length > 12) {
        return NextResponse.json(
          {
            error: "Ticker symbol too long",
            hint: "Ticker symbols should be 12 characters or less"
          },
          { status: 400 }
        )
      }
    }

    // CRYPTO symbol validation
    if (assetType === "CRYPTO") {
      // Auto-strip common quote currency suffixes
      let cryptoSymbol = normalizedSymbol
      if (cryptoSymbol.endsWith("USDT") && cryptoSymbol.length > 4) {
        cryptoSymbol = cryptoSymbol.slice(0, -4)
      } else if (cryptoSymbol.endsWith("USD") && cryptoSymbol.length > 3) {
        cryptoSymbol = cryptoSymbol.slice(0, -3)
      }

      // Validate format (letters and numbers only)
      if (!/^[A-Z0-9]+$/.test(cryptoSymbol)) {
        return NextResponse.json(
          {
            error: "Invalid cryptocurrency symbol format",
            hint: "Use the base symbol only (e.g., BTC, ETH, SOL)"
          },
          { status: 400 }
        )
      }

      // Max length check
      if (cryptoSymbol.length > 10) {
        return NextResponse.json(
          {
            error: "Cryptocurrency symbol too long",
            hint: "Crypto symbols should be 10 characters or less"
          },
          { status: 400 }
        )
      }

      // Use the cleaned symbol
      finalSymbol = cryptoSymbol
    }

    const holding = await createHolding(
      {
        accountId,
        symbol: finalSymbol,
        name: name.trim(),
        assetType: assetType as AssetType,
        quantity,
        costBasis,
        avgCostPerUnit,
        currency: currency || "USD",
        notes: notes?.trim(),
      },
      session.user.id
    )

    return NextResponse.json(holding, { status: 201 })
  } catch (error: any) {
    console.error("Error creating holding:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 }
      )
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A holding with this symbol already exists in this account" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create holding" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/portfolio/[id]/holdings
 * Update a holding (pass holdingId in body)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from updating holdings
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const body = await request.json()
    const {
      holdingId,
      name,
      assetType,
      quantity,
      costBasis,
      avgCostPerUnit,
      currency,
      notes,
    } = body

    if (!holdingId) {
      return NextResponse.json(
        { error: "Holding ID is required" },
        { status: 400 }
      )
    }

    if (assetType !== undefined && !Object.values(AssetType).includes(assetType)) {
      return NextResponse.json(
        { error: "Invalid asset type" },
        { status: 400 }
      )
    }

    const holding = await updateHolding(holdingId, session.user.id, {
      name: name?.trim(),
      assetType: assetType as AssetType,
      quantity,
      costBasis,
      avgCostPerUnit,
      currency,
      notes: notes?.trim(),
    })

    return NextResponse.json(holding)
  } catch (error: any) {
    console.error("Error updating holding:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Holding not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update holding" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]/holdings
 * Delete a holding (pass holdingId in body or query)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from deleting holdings
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const searchParams = request.nextUrl.searchParams
    const holdingId = searchParams.get("holdingId")

    if (!holdingId) {
      return NextResponse.json(
        { error: "Holding ID is required" },
        { status: 400 }
      )
    }

    await deleteHolding(holdingId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting holding:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Holding not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete holding" },
      { status: 500 }
    )
  }
}
