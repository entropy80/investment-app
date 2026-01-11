import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  createFinancialAccount,
  getPortfolioById,
} from "@/lib/portfolio/portfolio-service"
import { canCreateAccount } from "@/lib/portfolio/access"
import { AccountType } from "@prisma/client"
import { demoGuard } from "@/lib/demo/demo-guard"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/portfolio/[id]/accounts
 * List all accounts in a portfolio
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

    return NextResponse.json({
      accounts: portfolio.accounts,
      total: portfolio.accounts.length,
    })
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/[id]/accounts
 * Create a new financial account in a portfolio
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from creating accounts
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { id: portfolioId } = await params

    // Check if user can create more accounts
    const { allowed, current, limit, tier } = await canCreateAccount(
      session.user.id,
      portfolioId
    )

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Account limit reached. Your ${tier} plan allows ${limit} account(s) per portfolio. Upgrade to add more.`,
          code: "LIMIT_REACHED",
          current,
          limit,
          tier,
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, institution, accountType, currency, notes } = body

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      )
    }

    if (!institution || typeof institution !== "string" || institution.trim().length === 0) {
      return NextResponse.json(
        { error: "Institution name is required" },
        { status: 400 }
      )
    }

    if (!accountType || !Object.values(AccountType).includes(accountType)) {
      return NextResponse.json(
        { error: "Valid account type is required" },
        { status: 400 }
      )
    }

    const account = await createFinancialAccount(
      {
        portfolioId,
        name: name.trim(),
        institution: institution.trim(),
        accountType: accountType as AccountType,
        currency: currency || "USD",
        notes: notes?.trim(),
      },
      session.user.id
    )

    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    console.error("Error creating account:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Portfolio not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
