"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { DemoBanner } from "@/components/demo/demo-banner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Calendar, DollarSign } from "lucide-react"
import { BudgetSpreadsheet } from "@/components/budget/budget-spreadsheet"
import { BudgetData } from "@/lib/budget/types"

export default function BudgetPage() {
  const { data: session } = useSession()
  const isDemo = session?.user?.email === "demo@investment-app.com"

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newBudgetYear, setNewBudgetYear] = useState(currentYear)
  const [newBudgetCurrency, setNewBudgetCurrency] = useState("USD")
  const [creating, setCreating] = useState(false)

  // Fetch budget data
  const fetchBudget = useCallback(async (year: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/budget?year=${year}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch budget")
      }

      setBudgetData(data.budget)
      setAvailableYears(data.availableYears || [])
    } catch (err: any) {
      setError(err.message)
      setBudgetData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchBudget(selectedYear)
  }, [selectedYear, fetchBudget])

  // Create new budget
  const handleCreateBudget = async () => {
    setCreating(true)
    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newBudgetYear,
          currency: newBudgetCurrency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create budget")
      }

      // Close dialog and fetch the new budget
      setIsCreateDialogOpen(false)
      setSelectedYear(newBudgetYear)
      fetchBudget(newBudgetYear)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Update budget item
  const handleUpdateItem = async (categoryId: string, month: number, amount: number) => {
    try {
      const response = await fetch("/api/budget/item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          year: selectedYear,
          month,
          amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update budget item")
      }

      // Update local state
      if (budgetData) {
        const updatedCategories = budgetData.categories.map((category) => ({
          ...category,
          children: category.children.map((child) => {
            if (child.id === categoryId) {
              return {
                ...child,
                items: {
                  ...child.items,
                  [month]: { id: data.item.id, amount: data.item.amount },
                },
              }
            }
            return child
          }),
        }))

        setBudgetData({
          ...budgetData,
          categories: updatedCategories,
        })
      }
    } catch (err: any) {
      console.error("Failed to update budget item:", err)
      throw err
    }
  }

  // Generate year options (5 years back, 2 years forward)
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i)

  return (
    <div className="space-y-8">
      {/* Demo Mode Banner */}
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Plan and track your monthly budget
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year Selector */}
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                  {availableYears.includes(year) && " •"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create Budget Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Budget</DialogTitle>
                <DialogDescription>
                  Create a budget for a new year. The budget will be pre-populated with
                  default categories based on your template.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select
                    value={newBudgetYear.toString()}
                    onValueChange={(value) => setNewBudgetYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem
                          key={year}
                          value={year.toString()}
                          disabled={availableYears.includes(year)}
                        >
                          {year}
                          {availableYears.includes(year) && " (exists)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={newBudgetCurrency}
                    onValueChange={setNewBudgetCurrency}
                  >
                    <SelectTrigger>
                      <DollarSign className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBudget}
                  disabled={creating || availableYears.includes(newBudgetYear)}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Budget"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading budget...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !budgetData && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-muted p-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No budget for {selectedYear}</h3>
                <p className="text-muted-foreground mt-1">
                  Create a budget to start tracking your expenses
                </p>
              </div>
              <Button
                className="mt-4"
                onClick={() => {
                  setNewBudgetYear(selectedYear)
                  setIsCreateDialogOpen(true)
                }}
                disabled={isDemo}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create {selectedYear} Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Spreadsheet */}
      {!loading && budgetData && (
        <BudgetSpreadsheet
          categories={budgetData.categories}
          year={selectedYear}
          onUpdateItem={handleUpdateItem}
          disabled={isDemo}
        />
      )}
    </div>
  )
}
