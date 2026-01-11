import { prisma } from "@/lib/prisma"
import { BudgetCategory, BudgetItem } from "@prisma/client"
import { BUDGET_TEMPLATE, BUDGET_CATEGORY_ORDER } from "./budget-template"
import { BudgetCategoryWithItems, BudgetData, BudgetItemByMonth } from "./types"

// ============================================================================
// Budget Initialization
// ============================================================================

/**
 * Initialize a budget for a specific year with template categories
 * Creates all parent categories, child categories, and 12 months of budget items
 */
export async function initializeBudgetForYear(
  userId: string,
  year: number,
  currency: string = "USD"
): Promise<{ categoriesCreated: number; itemsCreated: number }> {
  let categoriesCreated = 0
  let itemsCreated = 0

  await prisma.$transaction(async (tx) => {
    let sortOrder = 0

    for (const key of BUDGET_CATEGORY_ORDER) {
      const template = BUDGET_TEMPLATE[key]
      if (!template) continue

      // Create parent category
      const parent = await tx.budgetCategory.create({
        data: {
          userId,
          name: template.name,
          sortOrder: sortOrder++,
        },
      })
      categoriesCreated++

      // Create child categories with budget items
      for (let i = 0; i < template.children.length; i++) {
        const child = await tx.budgetCategory.create({
          data: {
            userId,
            name: template.children[i],
            parentId: parent.id,
            sortOrder: i,
          },
        })
        categoriesCreated++

        // Create 12 budget items for each child (one per month)
        const budgetItems = Array.from({ length: 12 }, (_, month) => ({
          categoryId: child.id,
          year,
          month: month + 1,
          amount: 0,
          currency,
        }))

        await tx.budgetItem.createMany({
          data: budgetItems,
        })
        itemsCreated += 12
      }
    }
  })

  return { categoriesCreated, itemsCreated }
}

// ============================================================================
// Budget Retrieval
// ============================================================================

/**
 * Check if a budget exists for a specific year
 */
export async function hasBudgetForYear(
  userId: string,
  year: number
): Promise<boolean> {
  const count = await prisma.budgetItem.count({
    where: {
      year,
      category: {
        userId,
      },
    },
  })
  return count > 0
}

/**
 * Get budget data for a specific year
 * Returns hierarchical categories with their budget items
 */
export async function getBudgetForYear(
  userId: string,
  year: number
): Promise<BudgetData | null> {
  // Get all categories for user
  const categories = await prisma.budgetCategory.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }],
    include: {
      budgetItems: {
        where: { year },
      },
    },
  })

  if (categories.length === 0) {
    return null
  }

  // Check if any budget items exist for this year
  const hasItems = categories.some((c) => c.budgetItems.length > 0)
  if (!hasItems) {
    return null
  }

  // Build hierarchical structure
  const parentCategories = categories.filter((c) => c.parentId === null)
  const childCategories = categories.filter((c) => c.parentId !== null)

  const hierarchicalCategories: BudgetCategoryWithItems[] = parentCategories.map(
    (parent) => {
      const children = childCategories
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((child) => ({
          id: child.id,
          name: child.name,
          parentId: child.parentId,
          sortOrder: child.sortOrder,
          children: [],
          items: buildItemsByMonth(child.budgetItems),
        }))

      return {
        id: parent.id,
        name: parent.name,
        parentId: parent.parentId,
        sortOrder: parent.sortOrder,
        children,
        items: {} as BudgetItemByMonth,
      }
    }
  )

  // Get currency from first budget item
  const firstItem = categories.find((c) => c.budgetItems.length > 0)?.budgetItems[0]
  const currency = firstItem?.currency || "USD"

  return {
    year,
    categories: hierarchicalCategories,
    currency,
  }
}

/**
 * Convert budget items array to month-indexed object
 */
function buildItemsByMonth(items: BudgetItem[]): BudgetItemByMonth {
  const result: BudgetItemByMonth = {}
  for (const item of items) {
    result[item.month] = {
      id: item.id,
      amount: Number(item.amount),
    }
  }
  return result
}

// ============================================================================
// Budget Updates
// ============================================================================

/**
 * Update a single budget item
 */
export async function updateBudgetItem(
  userId: string,
  categoryId: string,
  year: number,
  month: number,
  amount: number
): Promise<BudgetItem> {
  // Verify the category belongs to the user
  const category = await prisma.budgetCategory.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  })

  if (!category) {
    throw new Error("Budget category not found or access denied")
  }

  // Upsert the budget item
  const item = await prisma.budgetItem.upsert({
    where: {
      categoryId_year_month: {
        categoryId,
        year,
        month,
      },
    },
    update: {
      amount,
    },
    create: {
      categoryId,
      year,
      month,
      amount,
      currency: "USD",
    },
  })

  return item
}

// ============================================================================
// Budget Deletion
// ============================================================================

/**
 * Delete all budget data for a specific year
 */
export async function deleteBudgetForYear(
  userId: string,
  year: number
): Promise<void> {
  // Get all category IDs for user
  const categories = await prisma.budgetCategory.findMany({
    where: { userId },
    select: { id: true },
  })

  const categoryIds = categories.map((c) => c.id)

  // Delete all budget items for the year
  await prisma.budgetItem.deleteMany({
    where: {
      categoryId: { in: categoryIds },
      year,
    },
  })
}

/**
 * Delete all budget categories and items for a user
 * (Used when user deletes their account)
 */
export async function deleteAllBudgetData(userId: string): Promise<void> {
  // Budget items are deleted via cascade when categories are deleted
  await prisma.budgetCategory.deleteMany({
    where: { userId },
  })
}

// ============================================================================
// Budget Years
// ============================================================================

/**
 * Get list of years that have budget data
 */
export async function getBudgetYears(userId: string): Promise<number[]> {
  const items = await prisma.budgetItem.findMany({
    where: {
      category: {
        userId,
      },
    },
    select: {
      year: true,
    },
    distinct: ["year"],
    orderBy: {
      year: "desc",
    },
  })

  return items.map((i) => i.year)
}
