import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  createTransaction,
  getTransactions,
  deleteTransaction,
} from "@/lib/portfolio/portfolio-service"
import { PortfolioTransactionType } from "@prisma/client"
import { demoGuard } from "@/lib/demo/demo-guard"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/transactions
 * List all transactions for a portfolio with enhanced filtering
 *
 * Query params:
 * - accountId: Filter by account
 * - holdingId: Filter by holding
 * - type: Transaction type(s), comma-separated (e.g., "BUY,SELL")
 * - symbol: Filter by symbol (partial match)
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - limit: Items per page (default: 50)
 * - offset: Skip items for pagination
 * - includeMetadata: Include filter metadata (types, symbols, accounts)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params
    const searchParams = request.nextUrl.searchParams

    const accountId = searchParams.get("accountId")
    const holdingId = searchParams.get("holdingId")
    const typeParam = searchParams.get("type")
    const symbol = searchParams.get("symbol")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")
    const includeMetadata = searchParams.get("includeMetadata") === "true"
    const hasFees = searchParams.get("hasFees") === "true"
    const category = searchParams.get("category")

    // Handle multiple types
    let typeFilter: PortfolioTransactionType | undefined
    let types: PortfolioTransactionType[] | undefined
    if (typeParam) {
      const typeList = typeParam.split(",").map(t => t.trim().toUpperCase())
      if (typeList.length === 1) {
        typeFilter = typeList[0] as PortfolioTransactionType
      } else {
        types = typeList as PortfolioTransactionType[]
      }
    }

    const { transactions, total } = await getTransactions(session.user.id, {
      portfolioId,
      accountId: accountId || undefined,
      holdingId: holdingId || undefined,
      type: typeFilter,
      types,
      symbol: symbol || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : undefined,
      includeAccount: true,
      hasFees: hasFees || undefined,
      category: category || undefined,
    })

    // Build response
    const response: any = {
      transactions,
      total,
      page: Math.floor((offset ? parseInt(offset) : 0) / (limit ? parseInt(limit) : 50)) + 1,
      limit: limit ? parseInt(limit) : 50,
      totalPages: Math.ceil(total / (limit ? parseInt(limit) : 50)),
    }

    // Include metadata for filter UI if requested
    if (includeMetadata) {
      const metadata = await getTransactionMetadata(session.user.id, portfolioId)
      response.metadata = metadata
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}

/**
 * Get transaction metadata for filter UI
 */
async function getTransactionMetadata(userId: string, portfolioId: string) {
  const { prisma } = await import("@/lib/prisma")

  // Get portfolio accounts
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      accounts: {
        select: { id: true, name: true },
      },
    },
  })

  if (!portfolio) return null

  const accountIds = portfolio.accounts.map(a => a.id)

  // Get transaction type counts
  const typeCounts = await prisma.portfolioTransaction.groupBy({
    by: ["type"],
    where: { accountId: { in: accountIds } },
    _count: { type: true },
  })

  // Get unique symbols
  const symbols = await prisma.portfolioTransaction.findMany({
    where: {
      accountId: { in: accountIds },
      symbol: { not: null },
    },
    select: { symbol: true },
    distinct: ["symbol"],
    orderBy: { symbol: "asc" },
  })

  return {
    types: typeCounts.map(tc => ({
      type: tc.type,
      count: tc._count.type,
    })),
    symbols: symbols.map(s => s.symbol).filter(Boolean),
    accounts: portfolio.accounts,
  }
}

/**
 * POST /api/portfolio/[id]/transactions
 * Create a new transaction
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from creating transactions
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const body = await request.json()
    const {
      accountId,
      holdingId,
      type,
      symbol,
      quantity,
      price,
      amount,
      fees,
      currency,
      date,
      notes,
    } = body

    // Validation
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    if (!type || !Object.values(PortfolioTransactionType).includes(type)) {
      return NextResponse.json(
        { error: "Valid transaction type is required" },
        { status: 400 }
      )
    }

    if (amount === undefined || typeof amount !== "number") {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: "Transaction date is required" },
        { status: 400 }
      )
    }

    const transaction = await createTransaction(
      {
        accountId,
        holdingId: holdingId || undefined,
        type: type as PortfolioTransactionType,
        symbol: symbol?.trim().toUpperCase(),
        quantity,
        price,
        amount,
        fees,
        currency: currency || "USD",
        date: new Date(date),
        notes: notes?.trim(),
      },
      session.user.id
    )

    return NextResponse.json(transaction, { status: 201 })
  } catch (error: any) {
    console.error("Error creating transaction:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]/transactions
 * Delete a transaction (pass transactionId in query)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from deleting transactions
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get("transactionId")

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    await deleteTransaction(transactionId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting transaction:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Transaction not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}
