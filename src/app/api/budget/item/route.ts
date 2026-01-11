import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { demoGuard } from "@/lib/demo/demo-guard"
import { updateBudgetItem } from "@/lib/budget/budget-service"

/**
 * PATCH /api/budget/item
 * Update a single budget item (cell value)
 * Body: { categoryId: string, year: number, month: number, amount: number }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users from updating budgets
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const body = await request.json()
    const { categoryId, year, month, amount } = body

    // Validation
    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 }
      )
    }

    if (!year || typeof year !== "number" || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Valid year is required (2000-2100)" },
        { status: 400 }
      )
    }

    if (!month || typeof month !== "number" || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Valid month is required (1-12)" },
        { status: 400 }
      )
    }

    if (amount === undefined || typeof amount !== "number" || amount < 0) {
      return NextResponse.json(
        { error: "Valid amount is required (non-negative number)" },
        { status: 400 }
      )
    }

    const item = await updateBudgetItem(
      session.user.id,
      categoryId,
      year,
      month,
      amount
    )

    return NextResponse.json({
      item: {
        id: item.id,
        categoryId: item.categoryId,
        year: item.year,
        month: item.month,
        amount: Number(item.amount),
        currency: item.currency,
      },
    })
  } catch (error: any) {
    console.error("Error updating budget item:", error)

    if (error.message === "Budget category not found or access denied") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update budget item" },
      { status: 500 }
    )
  }
}
