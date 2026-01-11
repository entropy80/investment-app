import { Decimal } from "@prisma/client/runtime/library"

export interface BudgetItemByMonth {
  [month: number]: {
    id: string
    amount: number
  }
}

export interface BudgetCategoryWithItems {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  children: BudgetCategoryWithItems[]
  items: BudgetItemByMonth
}

export interface BudgetData {
  year: number
  categories: BudgetCategoryWithItems[]
  currency: string
}

export interface BudgetSummary {
  startingBalance: number
  totalIncome: number[]      // 12 values (per month)
  totalExpenses: number[]    // 12 values (per month)
  net: number[]              // 12 values (income - expenses)
  projectedEndBalance: number[] // 12 values (cumulative)
  yearlyTotalIncome: number
  yearlyTotalExpenses: number
  yearlyNet: number
}

export interface CreateBudgetRequest {
  year: number
  currency?: string
  startingBalance?: number
}

export interface UpdateBudgetItemRequest {
  categoryId: string
  year: number
  month: number
  amount: number
}

// API Response types
export interface BudgetResponse {
  budget: BudgetData | null
  exists: boolean
}

export interface CreateBudgetResponse {
  success: boolean
  categoriesCreated: number
  itemsCreated: number
}

export interface UpdateBudgetItemResponse {
  item: {
    id: string
    categoryId: string
    year: number
    month: number
    amount: number
    currency: string
  }
}
