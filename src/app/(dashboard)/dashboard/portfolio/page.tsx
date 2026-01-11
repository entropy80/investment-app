"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { DemoBanner } from "@/components/demo/demo-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Briefcase, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"

interface Portfolio {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  baseCurrency: string
  createdAt: string
}

export default function PortfolioListPage() {
  const { data: session } = useSession()
  const isDemo = session?.user?.isDemo === true

  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string | null }[]>([])

  // Create form state
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newCurrency, setNewCurrency] = useState("USD")

  const fetchPortfolios = async () => {
    try {
      const response = await fetch("/api/portfolio")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch portfolios")
      }

      setPortfolios(data.portfolios)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrencies = async () => {
    try {
      const response = await fetch("/api/currency?action=list")
      const data = await response.json()
      if (data.currencies) {
        setCurrencies(data.currencies)
      }
    } catch (err) {
      console.error("Error fetching currencies:", err)
    }
  }

  useEffect(() => {
    fetchPortfolios()
    fetchCurrencies()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          baseCurrency: newCurrency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portfolio")
      }

      setPortfolios([...portfolios, data])
      setIsCreateDialogOpen(false)
      setNewName("")
      setNewDescription("")
      setNewCurrency("USD")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Demo Mode Banner */}
      {isDemo && <DemoBanner />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track your investments across multiple accounts
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Create a portfolio to organize your investment accounts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Portfolio Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Retirement, Trading, Kids College"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this portfolio"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Base Currency</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol ? `${c.code} (${c.symbol})` : c.code} - {c.name}
                      </SelectItem>
                    ))}
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
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Portfolio"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No portfolios yet</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Create your first portfolio to start tracking your investments
                across multiple accounts and brokers.
              </p>
              <Button
                className="mt-6"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} portfolio={portfolio} />
          ))}
        </div>
      )}
    </div>
  )
}

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`/api/portfolio/${portfolio.id}`)
        const data = await response.json()
        if (response.ok) {
          setSummary(data.summary)
        }
      } catch (err) {
        console.error("Failed to fetch summary:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [portfolio.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: portfolio.baseCurrency,
    }).format(amount)
  }

  return (
    <Link href={`/dashboard/portfolio/${portfolio.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {portfolio.name}
                {portfolio.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </CardTitle>
              {portfolio.description && (
                <CardDescription className="mt-1">
                  {portfolio.description}
                </CardDescription>
              )}
            </div>
            <Badge variant="outline">{portfolio.baseCurrency}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    summary.converted?.totalValue ?? summary.totalValue ?? 0
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(summary.totalGainLossPercent || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={
                    (summary.totalGainLossPercent || 0) >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {(summary.totalGainLossPercent || 0) >= 0 ? "+" : ""}
                  {(summary.totalGainLossPercent || 0).toFixed(2)}%
                </span>
                <span className="text-muted-foreground text-sm">
                  ({formatCurrency(
                    summary.converted?.totalGainLoss ?? summary.totalGainLoss ?? 0
                  )})
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{summary.accountCount || 0} accounts</span>
                <span>{summary.holdingCount || 0} holdings</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No holdings yet. Click to add accounts and holdings.
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
