"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, ArrowRightLeft, Wallet, PiggyBank, ChevronDown, ChevronRight, ArrowRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

export interface CategorySummary {
  category: string
  amount: number
  count: number
}

export interface MatchedTransfer {
  fromAccount: string
  fromAccountName: string
  toAccount: string
  toAccountName: string
  amount: number
  date: Date
  confidence: 'high' | 'medium' | 'low'
}

export interface InternalTransferSummary {
  fromAccountName: string
  toAccountName: string
  totalAmount: number
  count: number
}

export interface BankSummaryData {
  // Original fields (for backward compatibility)
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  incomeByCategory: CategorySummary[]
  expensesByCategory: CategorySummary[]

  // New fields for enhanced analysis
  trueIncome: number
  trueExpenses: number
  investmentContributions: number
  internalTransfers: MatchedTransfer[]
  internalTransferSummary: InternalTransferSummary[]
  trueSavingsRate: number | null
}

interface BankSummaryProps {
  data: BankSummaryData | null
  currency: string
  formatCurrency: (value: number, currency: string) => string
  isLoading?: boolean
}

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  SALARY: "Salary",
  RENTAL_INCOME: "Rental Income",
  ALLOWANCE: "Allowance",
  INVESTMENT_INCOME: "Investment Income",
  REFUND: "Refund",
  OTHER_INCOME: "Other Income",
  RENT: "Rent",
  ELECTRICITY: "Electricity",
  WATER_SEWER: "Water/Sewer",
  INTERNET: "Internet",
  HOME_MAINTENANCE: "Home Maint.",
  HOUSE_CLEANING: "Cleaning",
  HOME_SUPPLIES: "Home Supplies",
  LAWN_GARDEN: "Lawn/Garden",
  AUTO_INSURANCE: "Auto Insurance",
  AUTO_REPAIRS: "Auto Repairs",
  FUEL: "Fuel",
  DMV_FEES: "DMV",
  PARKING: "Parking",
  PUBLIC_TRANSIT: "Transit",
  HEALTH_INSURANCE: "Health Ins.",
  DOCTOR_DENTIST: "Doctor/Dentist",
  MEDICINE: "Medicine",
  VETERINARY: "Veterinary",
  GROCERIES: "Groceries",
  DINING: "Dining",
  CLOTHING: "Clothing",
  PERSONAL_CARE: "Personal Care",
  PHONE: "Phone",
  STREAMING: "Streaming",
  SOFTWARE: "Software",
  MEMBERSHIPS: "Memberships",
  TAXES: "Taxes",
  LEGAL_FEES: "Legal",
  BANK_FEES: "Bank Fees",
  ATM_WITHDRAWAL: "ATM",
  TRANSFER: "Transfer",
  INVESTMENT: "Investment",
  SAVINGS: "Savings",
  UNCATEGORIZED: "Uncategorized",
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category
}

// Colors for the chart
const INCOME_COLOR = "#22c55e" // green-500
const EXPENSE_COLOR = "#ef4444" // red-500

export function BankSummary({ data, currency, formatCurrency, isLoading }: BankSummaryProps) {
  const [showTransfers, setShowTransfers] = useState(false)

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-8 w-32 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="h-48 bg-muted rounded" />
        </div>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const {
    trueIncome,
    trueExpenses,
    investmentContributions,
    internalTransfers,
    internalTransferSummary,
    trueSavingsRate,
    incomeByCategory,
    expensesByCategory,
  } = data

  // Use true values for display, fallback to original for backward compatibility
  const displayIncome = trueIncome ?? data.totalIncome
  const displayExpenses = trueExpenses ?? data.totalExpenses
  const displayNetFlow = displayIncome + displayExpenses

  // Categories that are transfers, not true expenses
  const TRANSFER_CATEGORIES = ['TRANSFER', 'INVESTMENT', 'SAVINGS']

  // Prepare chart data - top 6 expenses by amount (excluding transfer categories)
  const topExpenses = [...expensesByCategory]
    .filter((item) => !TRANSFER_CATEGORIES.includes(item.category))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 6)
    .map((item) => ({
      name: getCategoryLabel(item.category),
      amount: Math.abs(item.amount),
      fullName: getCategoryLabel(item.category),
    }))

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Bank Account Summary</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Income</span>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {formatCurrency(displayIncome, currency)}
          </p>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-medium">Expenses</span>
          </div>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">
            {formatCurrency(Math.abs(displayExpenses), currency)}
          </p>
        </div>

        <div className={`p-3 rounded-lg ${displayNetFlow >= 0 ? "bg-blue-50 dark:bg-blue-950/30" : "bg-orange-50 dark:bg-orange-950/30"}`}>
          <div className={`flex items-center gap-2 mb-1 ${displayNetFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Net Flow</span>
          </div>
          <p className={`text-xl font-bold ${displayNetFlow >= 0 ? "text-blue-700 dark:text-blue-300" : "text-orange-700 dark:text-orange-300"}`}>
            {displayNetFlow >= 0 ? "+" : ""}{formatCurrency(displayNetFlow, currency)}
          </p>
        </div>

        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <PiggyBank className="h-4 w-4" />
            <span className="text-sm font-medium">Invested</span>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {formatCurrency(investmentContributions ?? 0, currency)}
          </p>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Savings Rate</span>
          </div>
          <p className="text-xl font-bold">
            {trueSavingsRate != null ? Math.round(trueSavingsRate) : (displayIncome > 0 ? Math.round((displayNetFlow / displayIncome) * 100) : 0)}%
          </p>
        </div>
      </div>

      {/* Internal Transfers Section */}
      {internalTransferSummary && internalTransferSummary.length > 0 && (
        <div className="mb-6 border rounded-lg">
          <button
            onClick={() => setShowTransfers(!showTransfers)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              {showTransfers ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                Internal Transfers ({internalTransfers?.length ?? 0})
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(
                internalTransferSummary.reduce((sum, t) => sum + t.totalAmount, 0),
                currency
              )} total
            </span>
          </button>

          {showTransfers && (
            <div className="px-3 pb-3 space-y-2">
              {internalTransferSummary.map((transfer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{transfer.fromAccountName}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{transfer.toAccountName}</span>
                    <span className="text-muted-foreground">
                      ({transfer.count} {transfer.count === 1 ? 'transfer' : 'transfers'})
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(transfer.totalAmount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Expenses Chart */}
      {topExpenses.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Expenses by Category</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topExpenses}
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCurrency(value, currency)}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value) || 0, currency), "Amount"]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {topExpenses.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Income Breakdown */}
      {incomeByCategory.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Income Sources</h4>
          <div className="flex flex-wrap gap-2">
            {incomeByCategory
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((item) => (
                <span
                  key={item.category}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm"
                >
                  {getCategoryLabel(item.category)}: {formatCurrency(item.amount, currency)}
                </span>
              ))}
          </div>
        </div>
      )}
    </Card>
  )
}
