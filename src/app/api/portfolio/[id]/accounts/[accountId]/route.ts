import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getFinancialAccountById,
  updateFinancialAccount,
  deleteFinancialAccount,
} from "@/lib/portfolio/portfolio-service"
import { AccountType } from "@prisma/client"
import { demoGuard } from "@/lib/demo/demo-guard"

interface RouteParams {
  params: Promise<{ id: string; accountId: string }>
}

/**
 * GET /api/portfolio/[id]/accounts/[accountId]
 * Get a specific financial account with holdings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId } = await params
    const account = await getFinancialAccountById(accountId, session.user.id)

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/portfolio/[id]/accounts/[accountId]
 * Update a financial account
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from updating accounts
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { accountId } = await params
    const body = await request.json()
    const { name, institution, accountType, currency, notes, isActive } = body

    // Validation
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Account name cannot be empty" },
        { status: 400 }
      )
    }

    if (accountType !== undefined && !Object.values(AccountType).includes(accountType)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      )
    }

    const account = await updateFinancialAccount(accountId, session.user.id, {
      name: name?.trim(),
      institution: institution?.trim(),
      accountType: accountType as AccountType,
      currency,
      notes: notes?.trim(),
      isActive,
    })

    return NextResponse.json(account)
  } catch (error: any) {
    console.error("Error updating account:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]/accounts/[accountId]
 * Delete a financial account
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from deleting accounts
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { accountId } = await params
    await deleteFinancialAccount(accountId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting account:", error)

    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}
