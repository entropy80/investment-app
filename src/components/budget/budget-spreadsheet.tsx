"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { EditableCell } from "./editable-cell"
import { BudgetCategoryWithItems, BudgetSummary } from "@/lib/budget/types"
import { MONTH_NAMES } from "@/lib/budget/budget-template"
import { cn } from "@/lib/utils"

interface BudgetSpreadsheetProps {
  categories: BudgetCategoryWithItems[]
  year: number
  onUpdateItem: (categoryId: string, month: number, amount: number) => Promise<void>
  disabled?: boolean
}

export function BudgetSpreadsheet({
  categories,
  year,
  onUpdateItem,
  disabled = false,
}: BudgetSpreadsheetProps) {
  // Calculate summary data
  const summary = useMemo(() => calculateSummary(categories), [categories])

  // Format currency
  const formatCurrency = (value: number) => {
    if (value === 0) return "-"
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Calculate category total for a month
  const getCategoryMonthTotal = (category: BudgetCategoryWithItems, month: number): number => {
    return category.children.reduce((sum, child) => {
      return sum + (child.items[month]?.amount || 0)
    }, 0)
  }

  // Calculate category yearly total
  const getCategoryYearTotal = (category: BudgetCategoryWithItems): number => {
    let total = 0
    for (let month = 1; month <= 12; month++) {
      total += getCategoryMonthTotal(category, month)
    }
    return total
  }

  // Calculate row total (sum of all months)
  const getRowTotal = (items: BudgetCategoryWithItems["items"]): number => {
    let total = 0
    for (let month = 1; month <= 12; month++) {
      total += items[month]?.amount || 0
    }
    return total
  }

  // Calculate row average
  const getRowAverage = (items: BudgetCategoryWithItems["items"]): number => {
    return getRowTotal(items) / 12
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            {/* Header */}
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 bg-muted/50 z-10 text-left px-4 py-3 font-semibold w-[200px] min-w-[200px]">
                  Category
                </th>
                {MONTH_NAMES.map((month) => (
                  <th key={month} className="text-right px-2 py-3 font-semibold w-[80px] min-w-[80px]">
                    {month}
                  </th>
                ))}
                <th className="text-right px-2 py-3 font-semibold w-[100px] min-w-[100px] bg-muted">
                  Total
                </th>
                <th className="text-right px-4 py-3 font-semibold w-[100px] min-w-[100px] bg-muted">
                  Average
                </th>
              </tr>
            </thead>

            <tbody>
              {/* Summary Section */}
              <SummarySection summary={summary} formatCurrency={formatCurrency} />

              {/* Spacer row */}
              <tr className="h-4 border-b">
                <td colSpan={15}></td>
              </tr>

              {/* Category Groups */}
              {categories.map((category) => (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  onUpdateItem={onUpdateItem}
                  disabled={disabled}
                  formatCurrency={formatCurrency}
                  getCategoryMonthTotal={getCategoryMonthTotal}
                  getCategoryYearTotal={getCategoryYearTotal}
                  getRowTotal={getRowTotal}
                  getRowAverage={getRowAverage}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Summary Section Component
function SummarySection({
  summary,
  formatCurrency,
}: {
  summary: BudgetSummary
  formatCurrency: (v: number) => string
}) {
  const summaryRows = [
    { label: "Total Income", values: summary.totalIncome, total: summary.yearlyTotalIncome, className: "text-green-600" },
    { label: "Total Expenses", values: summary.totalExpenses, total: summary.yearlyTotalExpenses, className: "text-red-600" },
    { label: "NET (Income - Expenses)", values: summary.net, total: summary.yearlyNet, className: summary.yearlyNet >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold" },
  ]

  return (
    <>
      {summaryRows.map((row) => (
        <tr key={row.label} className="border-b bg-muted/30">
          <td className="sticky left-0 bg-muted/30 z-10 px-4 py-2 font-medium">
            {row.label}
          </td>
          {row.values.map((value, index) => (
            <td key={index} className={cn("text-right px-2 py-2 text-sm", row.className)}>
              {formatCurrency(value)}
            </td>
          ))}
          <td className={cn("text-right px-2 py-2 text-sm bg-muted font-semibold", row.className)}>
            {formatCurrency(row.total)}
          </td>
          <td className={cn("text-right px-4 py-2 text-sm bg-muted", row.className)}>
            {formatCurrency(row.total / 12)}
          </td>
        </tr>
      ))}
    </>
  )
}

// Category Group Component
function CategoryGroup({
  category,
  onUpdateItem,
  disabled,
  formatCurrency,
  getCategoryMonthTotal,
  getCategoryYearTotal,
  getRowTotal,
  getRowAverage,
}: {
  category: BudgetCategoryWithItems
  onUpdateItem: (categoryId: string, month: number, amount: number) => Promise<void>
  disabled: boolean
  formatCurrency: (v: number) => string
  getCategoryMonthTotal: (c: BudgetCategoryWithItems, m: number) => number
  getCategoryYearTotal: (c: BudgetCategoryWithItems) => number
  getRowTotal: (items: BudgetCategoryWithItems["items"]) => number
  getRowAverage: (items: BudgetCategoryWithItems["items"]) => number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const yearTotal = getCategoryYearTotal(category)

  return (
    <>
      {/* Category Header Row */}
      <tr
        className="border-b bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="sticky left-0 bg-muted/50 z-10 px-4 py-2 font-semibold">
          <div className="flex items-center gap-2">
            <span className={cn(
              "transition-transform",
              isExpanded ? "rotate-90" : ""
            )}>
              ▶
            </span>
            {category.name}
          </div>
        </td>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <td key={month} className="text-right px-2 py-2 text-sm font-medium">
            {formatCurrency(getCategoryMonthTotal(category, month))}
          </td>
        ))}
        <td className="text-right px-2 py-2 text-sm font-semibold bg-muted">
          {formatCurrency(yearTotal)}
        </td>
        <td className="text-right px-4 py-2 text-sm bg-muted">
          {formatCurrency(yearTotal / 12)}
        </td>
      </tr>

      {/* Subcategory Rows */}
      {isExpanded &&
        category.children.map((child) => (
          <tr key={child.id} className="border-b hover:bg-muted/20">
            <td className="sticky left-0 bg-background z-10 px-4 py-1 pl-8 text-sm">
              {child.name}
            </td>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <td key={month} className="px-0 py-0">
                <EditableCell
                  value={child.items[month]?.amount || 0}
                  onChange={(amount) => onUpdateItem(child.id, month, amount)}
                  disabled={disabled}
                  formatValue={formatCurrency}
                />
              </td>
            ))}
            <td className="text-right px-2 py-1 text-sm bg-muted/50 font-medium">
              {formatCurrency(getRowTotal(child.items))}
            </td>
            <td className="text-right px-4 py-1 text-sm bg-muted/50">
              {formatCurrency(getRowAverage(child.items))}
            </td>
          </tr>
        ))}
    </>
  )
}

// Calculate summary from categories
function calculateSummary(categories: BudgetCategoryWithItems[]): BudgetSummary {
  const summary: BudgetSummary = {
    startingBalance: 0,
    totalIncome: new Array(12).fill(0),
    totalExpenses: new Array(12).fill(0),
    net: new Array(12).fill(0),
    projectedEndBalance: new Array(12).fill(0),
    yearlyTotalIncome: 0,
    yearlyTotalExpenses: 0,
    yearlyNet: 0,
  }

  // Find INCOME category
  const incomeCategory = categories.find((c) => c.name === "INCOME")

  // Calculate income totals per month
  if (incomeCategory) {
    for (let month = 1; month <= 12; month++) {
      const monthTotal = incomeCategory.children.reduce(
        (sum, child) => sum + (child.items[month]?.amount || 0),
        0
      )
      summary.totalIncome[month - 1] = monthTotal
      summary.yearlyTotalIncome += monthTotal
    }
  }

  // Calculate expense totals per month (all categories except INCOME)
  const expenseCategories = categories.filter((c) => c.name !== "INCOME")
  for (const category of expenseCategories) {
    for (let month = 1; month <= 12; month++) {
      const monthTotal = category.children.reduce(
        (sum, child) => sum + (child.items[month]?.amount || 0),
        0
      )
      summary.totalExpenses[month - 1] += monthTotal
      summary.yearlyTotalExpenses += monthTotal
    }
  }

  // Calculate NET per month
  for (let i = 0; i < 12; i++) {
    summary.net[i] = summary.totalIncome[i] - summary.totalExpenses[i]
  }
  summary.yearlyNet = summary.yearlyTotalIncome - summary.yearlyTotalExpenses

  // Calculate projected end balance (cumulative)
  let runningBalance = summary.startingBalance
  for (let i = 0; i < 12; i++) {
    runningBalance += summary.net[i]
    summary.projectedEndBalance[i] = runningBalance
  }

  return summary
}
