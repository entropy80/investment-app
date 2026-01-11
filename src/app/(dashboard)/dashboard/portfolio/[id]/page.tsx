"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { DemoBanner } from "@/components/demo/demo-banner"
import { PortfolioVisualization, PerformanceChart, PriceStatus } from "@/components/portfolio"
import { BankSummary, BankSummaryData } from "@/components/portfolio/bank-summary"
import { TaxReportView } from "@/components/tax"
import { DocumentsTab } from "@/components/documents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Plus,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Building2,
  Trash2,
  AlertCircle,
  PieChart,
  BarChart3,
  History,
  DollarSign,
  Upload,
  FileUp,
  Check,
  X,
  RefreshCw,
  Pencil,
  ChevronUp,
  Info,
  FileText,
  Calculator,
} from "lucide-react"

const ACCOUNT_TYPES = [
  { value: "BROKERAGE", label: "Brokerage" },
  { value: "BANK", label: "Bank Account" },
  { value: "CRYPTO_EXCHANGE", label: "Crypto Exchange" },
  { value: "RETIREMENT", label: "Retirement Account" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "OTHER", label: "Other" },
]

const ASSET_TYPES = [
  { value: "STOCK", label: "Stock" },
  { value: "ETF", label: "ETF" },
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "BOND", label: "Bond" },
  { value: "CRYPTO", label: "Cryptocurrency" },
  { value: "CASH", label: "Cash" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "COMMODITY", label: "Commodity" },
  { value: "OTHER", label: "Other" },
]

export default function PortfolioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const portfolioId = params.id as string
  const isDemo = session?.user?.isDemo === true

  const [portfolio, setPortfolio] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: "",
    institution: "",
    accountType: "BROKERAGE",
    currency: "USD",
  })
  const [holdingForm, setHoldingForm] = useState({
    symbol: "",
    name: "",
    assetType: "STOCK",
    quantity: "",
    costBasis: "",
    currency: "USD",
  })
  const [submitting, setSubmitting] = useState(false)

  // Import states
  const [importAccountId, setImportAccountId] = useState<string>("")
  const [brokerFormat, setBrokerFormat] = useState<string>("auto")
  const [importCurrency, setImportCurrency] = useState<string>("USD")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<string>("")
  const [importing, setImporting] = useState(false)
  const [dryRunning, setDryRunning] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importStep, setImportStep] = useState<"select" | "preview" | "result">("select")

  // Price states
  const [prices, setPrices] = useState<Record<string, { price: number; timestamp: string; source: string }>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [refreshingPrices, setRefreshingPrices] = useState(false)
  const [lastPriceRefresh, setLastPriceRefresh] = useState<Date | null>(null)

  // Currency states
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string | null }[]>([])
  const [changingCurrency, setChangingCurrency] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})

  // Transactions states
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionFilters, setTransactionFilters] = useState({
    type: "",
    symbol: "",
    startDate: "",
    endDate: "",
    accountId: "",
    hasFees: false,
    category: "",
  })
  const [transactionMetadata, setTransactionMetadata] = useState<any>(null)
  const transactionsLimit = 25

  // Bank summary state (income vs expenses)
  const [bankSummary, setBankSummary] = useState<BankSummaryData | null>(null)
  const [bankSummaryLoading, setBankSummaryLoading] = useState(false)

  // Realized gains state
  const [realizedGainsSummary, setRealizedGainsSummary] = useState<{
    totalRealizedGain: number
    shortTermGain: number
    longTermGain: number
  } | null>(null)

  // Holdings display state
  const [showClosedPositions, setShowClosedPositions] = useState(false)

  // Global account filter state
  const [globalAccountFilter, setGlobalAccountFilter] = useState<string>("")

  // Expanded accounts state for accordion-style cards
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  const toggleAccountExpanded = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  // Calculate filtered summary when account filter is active
  const displaySummary = useMemo(() => {
    // If no filter, use server-calculated summary
    if (!globalAccountFilter || !portfolio || !summary) {
      return summary
    }

    // Filter to selected account
    const accountsToProcess = portfolio.accounts.filter(
      (a: any) => a.id === globalAccountFilter
    )

    if (accountsToProcess.length === 0) return summary

    let totalValue = 0
    let totalCostBasis = 0
    let holdingCount = 0
    const assetAllocationMap = new Map<string, number>()

    for (const account of accountsToProcess) {
      for (const holding of account.holdings) {
        const quantity = Number(holding.quantity)
        const costBasis = holding.costBasis ? Number(holding.costBasis) : 0
        const isCash = holding.symbol.startsWith('CASH.')

        if (quantity === 0) continue

        holdingCount++

        let currentValueInUSD: number

        if (isCash) {
          // For cash holdings, extract currency and convert to USD
          // e.g., CASH.KWD -> KWD, then use exchange rate to convert to USD
          const cashCurrency = holding.symbol.split('.')[1] || 'USD'
          const rateToUSD = exchangeRates[cashCurrency] || 1
          currentValueInUSD = quantity * rateToUSD
        } else {
          // Securities: prices are fetched in USD
          const priceInfo = prices[holding.id]
          const holdingCurrency = holding.currency || account.currency || 'USD'

          if (priceInfo?.price) {
            // Real-time price from API (already in USD)
            currentValueInUSD = quantity * priceInfo.price
          } else {
            // No API price - use avgCostPerUnit (stored in holding's currency)
            const fallbackPrice = holding.avgCostPerUnit ? Number(holding.avgCostPerUnit) : 0
            const valueInHoldingCurrency = quantity * fallbackPrice
            // Convert to USD if needed
            if (holdingCurrency !== 'USD') {
              const rateToUSD = exchangeRates[holdingCurrency] || 1
              currentValueInUSD = valueInHoldingCurrency * rateToUSD
            } else {
              currentValueInUSD = valueInHoldingCurrency
            }
          }

          // Cost basis needs conversion too if holding is non-USD
          if (holdingCurrency !== 'USD' && costBasis > 0) {
            const costRateToUSD = exchangeRates[holdingCurrency] || 1
            totalCostBasis += costBasis * costRateToUSD
          } else {
            totalCostBasis += costBasis
          }
        }

        totalValue += currentValueInUSD

        const existing = assetAllocationMap.get(holding.assetType) || 0
        assetAllocationMap.set(holding.assetType, existing + currentValueInUSD)
      }
    }

    // Calculate gain/loss (exclude cash from calculation)
    const cashValue = assetAllocationMap.get('CASH') || 0
    const securitiesValue = totalValue - cashValue
    const totalGainLoss = securitiesValue - totalCostBasis
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0

    const assetAllocation = Array.from(assetAllocationMap.entries())
      .map(([assetType, value]) => ({
        assetType,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)

    // Build filtered summary, keeping base summary properties
    // All values are now in USD
    const filteredSummary = {
      ...summary,
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      holdingCount,
      accountCount: 1,
      assetAllocation,
    }

    // Apply currency conversion if needed (from USD to display currency)
    if (summary.converted && summary.baseCurrency !== 'USD') {
      const rate = summary.converted.exchangeRate
      filteredSummary.converted = {
        ...summary.converted,
        totalValue: totalValue * rate,
        totalCostBasis: totalCostBasis * rate,
        totalGainLoss: totalGainLoss * rate,
        assetAllocation: assetAllocation.map(item => ({
          ...item,
          value: item.value * rate,
        })),
      }
    }

    return filteredSummary
  }, [globalAccountFilter, portfolio, summary, prices, exchangeRates])

  // Calculate account-level summary for accordion cards
  const calculateAccountSummary = (account: any) => {
    let totalValue = 0
    let totalCostBasis = 0
    let holdingCount = 0

    const holdings = showClosedPositions
      ? account.holdings
      : account.holdings?.filter((h: any) => Number(h.quantity) > 0) || []

    for (const holding of holdings) {
      const quantity = Number(holding.quantity)
      const costBasis = holding.costBasis ? Number(holding.costBasis) : 0
      const isCash = holding.symbol.startsWith('CASH.')

      if (quantity === 0) continue
      holdingCount++

      // For cash holdings, extract currency from symbol (e.g., CASH.KWD -> KWD)
      // For other holdings, use stored currency or fall back to account currency
      const holdingCurrency = isCash
        ? holding.symbol.split('.')[1] || 'USD'
        : holding.currency || account.currency || 'USD'

      if (isCash) {
        // Cash holdings: quantity is the value in cash currency (from symbol)
        // Convert to account currency if different
        if (holdingCurrency !== account.currency) {
          const rateToAccount = exchangeRates[holdingCurrency] / (exchangeRates[account.currency] || 1)
          totalValue += quantity * rateToAccount
        } else {
          totalValue += quantity
        }
      } else {
        // Securities: use price from prices map or fallback to avgCostPerUnit
        const priceInfo = prices[holding.id]
        if (priceInfo?.price) {
          // API price is in USD, convert to account currency
          const priceInAccountCurrency = priceInfo.price / (exchangeRates[account.currency] || 1)
          totalValue += quantity * priceInAccountCurrency
        } else {
          // Fallback: avgCostPerUnit is in holding currency
          const fallbackPrice = holding.avgCostPerUnit ? Number(holding.avgCostPerUnit) : 0
          if (holdingCurrency !== account.currency) {
            const rateToAccount = exchangeRates[holdingCurrency] / (exchangeRates[account.currency] || 1)
            totalValue += quantity * fallbackPrice * rateToAccount
          } else {
            totalValue += quantity * fallbackPrice
          }
        }
        // Cost basis is in holding currency, convert to account currency if needed
        if (holdingCurrency !== account.currency && costBasis > 0) {
          const rateToAccount = exchangeRates[holdingCurrency] / (exchangeRates[account.currency] || 1)
          totalCostBasis += costBasis * rateToAccount
        } else {
          totalCostBasis += costBasis
        }
      }
    }

    // Calculate gain/loss (excluding cash positions)
    const cashHoldings = holdings.filter((h: any) => h.symbol.startsWith('CASH.'))
    const cashValue = cashHoldings.reduce((sum: number, h: any) => {
      // Extract currency from symbol (e.g., CASH.KWD -> KWD)
      const cashCurrency = h.symbol.split('.')[1] || 'USD'
      const qty = Number(h.quantity)
      if (cashCurrency !== account.currency) {
        const rateToAccount = exchangeRates[cashCurrency] / (exchangeRates[account.currency] || 1)
        return sum + qty * rateToAccount
      }
      return sum + qty
    }, 0)
    const securitiesValue = totalValue - cashValue

    const gainLoss = securitiesValue - totalCostBasis
    const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0

    return {
      totalValue,
      totalCostBasis,
      gainLoss,
      gainLossPercent,
      holdingCount,
      hasSecurities: totalCostBasis > 0
    }
  }

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch portfolio")
      }

      setPortfolio(data.portfolio)
      setSummary(data.summary)
      // Initialize lastPriceRefresh from portfolio data
      if (data.portfolio?.lastPriceRefresh) {
        setLastPriceRefresh(new Date(data.portfolio.lastPriceRefresh))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPrices = async () => {
    if (!portfolioId) return

    setPricesLoading(true)
    try {
      const response = await fetch(`/api/portfolio/prices?portfolioId=${portfolioId}`)
      const data = await response.json()

      if (response.ok && data.prices) {
        setPrices(data.prices)
      }
    } catch (err) {
      console.error("Error fetching prices:", err)
    } finally {
      setPricesLoading(false)
    }
  }

  const handleRefreshPrices = async () => {
    if (!portfolioId) return

    setRefreshingPrices(true)
    try {
      const response = await fetch("/api/portfolio/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh prices")
      }

      // Use server-returned timestamp
      if (data.lastPriceRefresh) {
        setLastPriceRefresh(new Date(data.lastPriceRefresh))
      } else {
        setLastPriceRefresh(new Date())
      }
      // Fetch updated prices from database
      await fetchPrices()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRefreshingPrices(false)
    }
  }

  const fetchCurrencies = async () => {
    try {
      const response = await fetch("/api/currency?action=list")
      const data = await response.json()
      if (response.ok && data.currencies) {
        setCurrencies(data.currencies)
      }
    } catch (err) {
      console.error("Error fetching currencies:", err)
    }
  }

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch("/api/currency?action=rates&base=USD")
      const data = await response.json()
      if (response.ok && data.rates && Array.isArray(data.rates)) {
        // API returns array: [{ fromCurrency, toCurrency, rate }, ...]
        // Store rates as currency -> USD multiplier (inverse of USD -> currency)
        // e.g., USD->KWD = 0.307, so KWD->USD = 1/0.307 = 3.257
        const ratesMap: Record<string, number> = { USD: 1 }
        for (const rateObj of data.rates) {
          if (rateObj.toCurrency && rateObj.rate) {
            ratesMap[rateObj.toCurrency] = 1 / rateObj.rate // Convert to "currency to USD" rate
          }
        }
        setExchangeRates(ratesMap)
      }
    } catch (err) {
      console.error("Error fetching exchange rates:", err)
    }
  }

  const fetchTransactions = async (page: number = 1, includeMetadata: boolean = false) => {
    if (!portfolioId) return

    setTransactionsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("limit", transactionsLimit.toString())
      params.set("offset", ((page - 1) * transactionsLimit).toString())

      if (transactionFilters.type) {
        params.set("type", transactionFilters.type)
      }
      if (transactionFilters.symbol) {
        params.set("symbol", transactionFilters.symbol)
      }
      if (transactionFilters.startDate) {
        params.set("startDate", transactionFilters.startDate)
      }
      if (transactionFilters.endDate) {
        params.set("endDate", transactionFilters.endDate)
      }
      if (transactionFilters.accountId) {
        params.set("accountId", transactionFilters.accountId)
      }
      if (transactionFilters.hasFees) {
        params.set("hasFees", "true")
      }
      if (transactionFilters.category) {
        params.set("category", transactionFilters.category)
      }
      if (includeMetadata) {
        params.set("includeMetadata", "true")
      }

      // Fetch realized gains summary in parallel with transactions
      const [txResponse, gainsResponse] = await Promise.all([
        fetch(`/api/portfolio/${portfolioId}/transactions?${params}`),
        realizedGainsSummary === null
          ? fetch(`/api/portfolio/${portfolioId}/tax-lots?action=realized-gains`)
          : Promise.resolve(null),
      ])

      if (gainsResponse) {
        const gainsData = await gainsResponse.json()
        if (gainsResponse.ok) {
          setRealizedGainsSummary({
            totalRealizedGain: gainsData.totalRealizedGain || 0,
            shortTermGain: gainsData.shortTermGain || 0,
            longTermGain: gainsData.longTermGain || 0,
          })
        }
      }

      const response = txResponse
      const data = await response.json()

      if (response.ok) {
        setTransactions(data.transactions || [])
        setTransactionsTotal(data.total || 0)
        setTransactionsPage(page)
        if (data.metadata) {
          setTransactionMetadata(data.metadata)
        }
      }
    } catch (err) {
      console.error("Error fetching transactions:", err)
    } finally {
      setTransactionsLoading(false)
    }
  }

  const fetchBankSummary = async () => {
    if (!portfolioId) return

    setBankSummaryLoading(true)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/analytics?type=bank_summary`)
      const result = await response.json()

      if (response.ok && result.data) {
        setBankSummary(result.data)
      }
    } catch (err) {
      console.error("Error fetching bank summary:", err)
    } finally {
      setBankSummaryLoading(false)
    }
  }

  const handleChangeCurrency = async (newCurrency: string) => {
    if (!portfolioId || changingCurrency) return

    setChangingCurrency(true)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseCurrency: newCurrency }),
      })

      if (!response.ok) {
        throw new Error("Failed to update currency")
      }

      // Refresh portfolio data to get new converted values
      await fetchPortfolio()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChangingCurrency(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
    fetchCurrencies()
    fetchExchangeRates()
  }, [portfolioId])

  useEffect(() => {
    if (portfolio) {
      fetchPrices()
    }
  }, [portfolio])

  const handleAddAccount = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      await fetchPortfolio()
      setIsAddAccountOpen(false)
      setAccountForm({
        name: "",
        institution: "",
        accountType: "BROKERAGE",
        currency: "USD",
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddHolding = async () => {
    if (!selectedAccountId) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          symbol: holdingForm.symbol.toUpperCase(),
          name: holdingForm.name,
          assetType: holdingForm.assetType,
          quantity: parseFloat(holdingForm.quantity) || 0,
          costBasis: holdingForm.costBasis
            ? parseFloat(holdingForm.costBasis)
            : undefined,
          // For non-priceable assets (REAL_ESTATE, OTHER, COMMODITY), set avgCostPerUnit
          // to costBasis so gain/loss calculates correctly (value = quantity * avgCostPerUnit)
          avgCostPerUnit: ["REAL_ESTATE", "OTHER", "COMMODITY"].includes(holdingForm.assetType)
            && holdingForm.costBasis
            ? parseFloat(holdingForm.costBasis)
            : undefined,
          currency: holdingForm.currency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create holding")
      }

      await fetchPortfolio()
      setIsAddHoldingOpen(false)
      setHoldingForm({
        symbol: "",
        name: "",
        assetType: "STOCK",
        quantity: "",
        costBasis: "",
        currency: "USD",
      })
      setSelectedAccountId("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account and all its holdings?")) {
      return
    }

    try {
      const response = await fetch(
        `/api/portfolio/${portfolioId}/accounts/${accountId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete account")
      }

      await fetchPortfolio()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteHolding = async (holdingId: string) => {
    if (!confirm("Are you sure you want to delete this holding?")) {
      return
    }

    try {
      const response = await fetch(
        `/api/portfolio/${portfolioId}/holdings?holdingId=${holdingId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete holding")
      }

      await fetchPortfolio()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      const content = await file.text()
      // Show first 10 lines as preview
      const lines = content.split("\n").slice(0, 10)
      setCsvPreview(lines.join("\n"))
    }
  }

  const handleDryRun = async () => {
    if (!csvFile || !importAccountId) return

    setDryRunning(true)
    setError(null)
    try {
      const csvContent = await csvFile.text()
      const response = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: importAccountId,
          type: "broker",
          brokerFormat: brokerFormat === "auto" ? undefined : brokerFormat,
          currency: importCurrency,
          csvContent,
          dryRun: true,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to preview import")
      }

      setImportResult(result)
      setImportStep("preview")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDryRunning(false)
    }
  }

  const handleImport = async () => {
    if (!csvFile || !importAccountId) return

    setImporting(true)
    setError(null)
    try {
      const csvContent = await csvFile.text()
      const response = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: importAccountId,
          type: "broker",
          brokerFormat: brokerFormat === "auto" ? undefined : brokerFormat,
          currency: importCurrency,
          csvContent,
          dryRun: false,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to import")
      }

      setImportResult(result)
      setImportStep("result")
      await fetchPortfolio()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setCsvFile(null)
    setCsvPreview("")
    setImportResult(null)
    setImportStep("select")
    setImportAccountId("")
    setBrokerFormat("auto")
    setImportCurrency("USD")
  }

  const closeImportDialog = () => {
    setIsImportOpen(false)
    resetImport()
  }

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !portfolio) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/portfolio">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portfolios
          </Link>
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Demo Mode Banner */}
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Button variant="ghost" className="mb-4" asChild>
            <Link href="/dashboard/portfolio">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portfolios
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 flex-wrap">
            {portfolio?.name}
            {portfolio?.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </h1>
          {portfolio?.description && (
            <p className="text-muted-foreground mt-2">{portfolio.description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Financial Account</DialogTitle>
                <DialogDescription>
                  Add a new brokerage, bank, or investment account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="e.g., Fidelity IRA"
                    value={accountForm.name}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    placeholder="e.g., Fidelity, Vanguard, Coinbase"
                    value={accountForm.institution}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        institution: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select
                    value={accountForm.accountType}
                    onValueChange={(v) =>
                      setAccountForm({ ...accountForm, accountType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={accountForm.currency}
                    onValueChange={(v) =>
                      setAccountForm({ ...accountForm, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  onClick={() => setIsAddAccountOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAccount}
                  disabled={
                    !accountForm.name ||
                    !accountForm.institution ||
                    submitting
                  }
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add Account"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddHoldingOpen} onOpenChange={setIsAddHoldingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Holding</DialogTitle>
                <DialogDescription>
                  Add a new stock, ETF, crypto, cash, or other asset
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={(accountId) => {
                      setSelectedAccountId(accountId)
                      // Default holding currency to the selected account's currency
                      const account = portfolio?.accounts?.find((a: any) => a.id === accountId)
                      if (account?.currency) {
                        setHoldingForm((prev) => ({ ...prev, currency: account.currency }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolio?.accounts?.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.institution})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select
                      value={holdingForm.assetType}
                      onValueChange={(v) => {
                        // When switching to CASH, reset symbol and name
                        if (v === "CASH") {
                          setHoldingForm({
                            ...holdingForm,
                            assetType: v,
                            symbol: "",
                            name: "",
                            quantity: "",
                            costBasis: "",
                          })
                        } else if (v === "REAL_ESTATE") {
                          // When switching to REAL_ESTATE, auto-set quantity to 1
                          setHoldingForm({
                            ...holdingForm,
                            assetType: v,
                            symbol: "",
                            name: "",
                            quantity: "1",
                            costBasis: "",
                          })
                        } else if (holdingForm.assetType === "CASH" || holdingForm.assetType === "REAL_ESTATE") {
                          // When switching away from CASH or REAL_ESTATE, reset form
                          setHoldingForm({
                            ...holdingForm,
                            assetType: v,
                            symbol: "",
                            name: "",
                            quantity: "",
                            costBasis: "",
                          })
                        } else {
                          setHoldingForm({ ...holdingForm, assetType: v })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {holdingForm.assetType === "CASH" ? (
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={holdingForm.symbol.replace("CASH.", "")}
                        onValueChange={(v) =>
                          setHoldingForm({
                            ...holdingForm,
                            symbol: `CASH.${v}`,
                            name: `${v} Cash`,
                            currency: v,
                          })
                        }
                      >
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
                  ) : holdingForm.assetType === "REAL_ESTATE" ? (
                    <div className="space-y-2">
                      <Label>Property ID</Label>
                      <Input
                        placeholder="e.g., MainResidence, Rental-1"
                        value={holdingForm.symbol}
                        onChange={(e) =>
                          setHoldingForm({
                            ...holdingForm,
                            symbol: e.target.value.replace(/\s/g, '-'),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        A unique identifier for this property (spaces converted to dashes)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Symbol</Label>
                      <Input
                        placeholder={
                          holdingForm.assetType === "CRYPTO"
                            ? "e.g., BTC, ETH"
                            : holdingForm.assetType === "OTHER"
                            ? "e.g., Asset-1"
                            : "e.g., AAPL, VOO"
                        }
                        value={holdingForm.symbol}
                        onChange={(e) =>
                          setHoldingForm({
                            ...holdingForm,
                            symbol: e.target.value.toUpperCase(),
                          })
                        }
                      />
                      {holdingForm.assetType === "CRYPTO" && (
                        <p className="text-xs text-muted-foreground">
                          Enter base symbol only (BTC, not BTCUSD)
                        </p>
                      )}
                      {holdingForm.assetType === "COMMODITY" && (
                        <p className="text-xs text-muted-foreground">
                          For ETFs use ticker (GLD, USO). Futures symbols may not have price data.
                        </p>
                      )}
                      {holdingForm.assetType === "OTHER" && (
                        <p className="text-xs text-muted-foreground">
                          Use a custom identifier (no spaces allowed).
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Warning banners for non-priceable asset types */}
                {holdingForm.assetType === "REAL_ESTATE" && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-400">Real Estate Property</p>
                      <p className="text-blue-700 dark:text-blue-500 mt-1">
                        Enter the current market value below. Update manually when property value changes.
                      </p>
                    </div>
                  </div>
                )}

                {holdingForm.assetType === "OTHER" && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-400">Manual Valuation Required</p>
                      <p className="text-amber-700 dark:text-amber-500 mt-1">
                        Prices for this asset type cannot be fetched automatically. Enter the value in Cost Basis and set Quantity to 1.
                      </p>
                    </div>
                  </div>
                )}

                {holdingForm.assetType === "BOND" && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-400">Bond Pricing Note</p>
                      <p className="text-blue-700 dark:text-blue-500 mt-1">
                        Bond ETFs (BND, TLT, AGG) have automatic pricing. Individual bonds may require manual valuation.
                      </p>
                    </div>
                  </div>
                )}

                {holdingForm.assetType !== "CASH" && (
                  <div className="space-y-2">
                    <Label>
                      {holdingForm.assetType === "REAL_ESTATE" ? "Property Name" : "Name"}
                    </Label>
                    <Input
                      placeholder={
                        holdingForm.assetType === "REAL_ESTATE"
                          ? "e.g., 123 Main Street, Beach House"
                          : "e.g., Apple Inc."
                      }
                      value={holdingForm.name}
                      onChange={(e) =>
                        setHoldingForm({ ...holdingForm, name: e.target.value })
                      }
                    />
                  </div>
                )}
                {holdingForm.assetType === "REAL_ESTATE" ? (
                  <div className="space-y-2">
                    <Label>Property Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Current market value"
                      value={holdingForm.costBasis}
                      onChange={(e) =>
                        setHoldingForm({
                          ...holdingForm,
                          costBasis: e.target.value,
                          quantity: "1",
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the current estimated market value of this property
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{holdingForm.assetType === "CASH" ? "Amount" : "Quantity"}</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={holdingForm.quantity}
                        onChange={(e) =>
                          setHoldingForm({
                            ...holdingForm,
                            quantity: e.target.value,
                          })
                        }
                      />
                      {holdingForm.assetType === "CASH" && (
                        <p className="text-xs text-muted-foreground">
                          Enter the cash amount in the selected currency
                        </p>
                      )}
                    </div>
                    {holdingForm.assetType !== "CASH" && (
                      <div className="space-y-2">
                        <Label>Cost Basis (Optional)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Total cost"
                          value={holdingForm.costBasis}
                          onChange={(e) =>
                            setHoldingForm({
                              ...holdingForm,
                              costBasis: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddHoldingOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddHolding}
                  disabled={
                    !selectedAccountId ||
                    !holdingForm.symbol ||
                    !holdingForm.name ||
                    (holdingForm.assetType === "REAL_ESTATE"
                      ? !holdingForm.costBasis
                      : !holdingForm.quantity) ||
                    submitting
                  }
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add Holding"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Refresh Prices Button */}
          <Button
            variant="outline"
            onClick={handleRefreshPrices}
            disabled={refreshingPrices || pricesLoading}
          >
            {refreshingPrices ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Prices
          </Button>

          {/* Import CSV Dialog */}
          <Dialog open={isImportOpen} onOpenChange={(open) => {
            if (!open) closeImportDialog()
            else setIsImportOpen(true)
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {importStep === "select" && "Import Transactions from CSV"}
                  {importStep === "preview" && "Preview Import"}
                  {importStep === "result" && "Import Complete"}
                </DialogTitle>
                <DialogDescription>
                  {importStep === "select" && "Upload a CSV file from your broker to import transactions"}
                  {importStep === "preview" && "Review what will be imported before confirming"}
                  {importStep === "result" && "Your transactions have been imported"}
                </DialogDescription>
              </DialogHeader>

              {importStep === "select" && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <Select value={importAccountId} onValueChange={setImportAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account to import into" />
                      </SelectTrigger>
                      <SelectContent>
                        {portfolio?.accounts?.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.institution})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Broker Format</Label>
                    <Select value={brokerFormat} onValueChange={setBrokerFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="schwab">Charles Schwab</SelectItem>
                        <SelectItem value="ibkr">Interactive Brokers</SelectItem>
                        <SelectItem value="chase_bank">Chase Bank</SelectItem>
                        <SelectItem value="nbk">NBK (Kuwait)</SelectItem>
                        <SelectItem value="bofa">Bank of America</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Auto-detect works for most CSV files
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Currency</Label>
                    <Select value={importCurrency} onValueChange={setImportCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol ? `${c.code} (${c.symbol})` : c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Currency for transactions in this CSV file
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>CSV File</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        {csvFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileUp className="h-5 w-5 text-green-500" />
                            <span className="font-medium">{csvFile.name}</span>
                            <span className="text-muted-foreground">
                              ({(csvFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to select a CSV file or drag and drop
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {csvPreview && (
                    <div className="space-y-2">
                      <Label>Preview (first 10 lines)</Label>
                      <div className="overflow-hidden rounded-lg">
                        <pre className="text-xs bg-muted p-3 overflow-x-auto max-h-40 w-0 min-w-full">
                          {csvPreview}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importStep === "preview" && importResult && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <Card>
                      <CardContent className="p-3 sm:pt-4">
                        <div className="text-center">
                          <p className="text-xl sm:text-3xl font-bold text-green-500">
                            {importResult.imported}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">To Import</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:pt-4">
                        <div className="text-center">
                          <p className="text-xl sm:text-3xl font-bold text-yellow-500">
                            {importResult.skipped}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Duplicates</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:pt-4">
                        <div className="text-center">
                          <p className="text-xl sm:text-3xl font-bold text-red-500">
                            {importResult.errors}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Errors</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {importResult.detectedFormat && (
                    <p className="text-sm text-muted-foreground">
                      Detected format: <span className="font-medium">{importResult.detectedFormat}</span>
                    </p>
                  )}

                  {importResult.imported > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm">
                        <Check className="h-4 w-4 inline mr-2 text-green-500" />
                        Ready to import {importResult.imported} new transaction{importResult.imported !== 1 ? "s" : ""}
                      </p>
                      {importResult.skipped > 0 && (
                        <p className="text-sm mt-2">
                          <X className="h-4 w-4 inline mr-2 text-yellow-500" />
                          {importResult.skipped} duplicate{importResult.skipped !== 1 ? "s" : ""} will be skipped
                        </p>
                      )}
                    </div>
                  )}

                  {importResult.imported === 0 && importResult.skipped > 0 && (
                    <Card className="border-yellow-500/50 bg-yellow-500/10">
                      <CardContent className="pt-4">
                        <p className="text-sm">
                          All transactions in this file have already been imported.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {importStep === "result" && importResult && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold">Import Successful</h3>
                      <p className="text-muted-foreground mt-2">
                        {importResult.imported} transaction{importResult.imported !== 1 ? "s" : ""} imported
                        {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                      </p>
                      {importResult.importBatch && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Batch ID: {importResult.importBatch}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Card className="border-destructive">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                {importStep === "select" && (
                  <>
                    <Button variant="outline" onClick={closeImportDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDryRun}
                      disabled={!csvFile || !importAccountId || dryRunning}
                    >
                      {dryRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        "Preview Import"
                      )}
                    </Button>
                  </>
                )}

                {importStep === "preview" && (
                  <>
                    <Button variant="outline" onClick={() => setImportStep("select")}>
                      Back
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={importing || importResult?.imported === 0}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Importing...
                        </>
                      ) : (
                        `Import ${importResult?.imported || 0} Transactions`
                      )}
                    </Button>
                  </>
                )}

                {importStep === "result" && (
                  <Button onClick={closeImportDialog}>Done</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Summary Cards */}
      {displaySummary && (() => {
        const baseCurrency = displaySummary.baseCurrency || 'USD'
        const hasConversion = displaySummary.converted && baseCurrency !== 'USD'
        const displayValue = hasConversion ? displaySummary.converted.totalValue : displaySummary.totalValue
        const displayCostBasis = hasConversion ? displaySummary.converted.totalCostBasis : displaySummary.totalCostBasis
        const displayGainLoss = hasConversion ? displaySummary.converted.totalGainLoss : displaySummary.totalGainLoss

        return (
          <div className="space-y-4">
            {/* Account & Currency Filters */}
            <div className="flex flex-wrap items-center justify-end gap-4">
              {/* Account Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Account:</span>
                <Select
                  value={globalAccountFilter || "all"}
                  onValueChange={(v) => {
                    const newValue = v === "all" ? "" : v
                    setGlobalAccountFilter(newValue)
                    // Sync with transactions filter
                    setTransactionFilters(prev => ({ ...prev, accountId: newValue }))
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    {portfolio?.accounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Display:</span>
                <Select
                  value={baseCurrency}
                  onValueChange={handleChangeCurrency}
                  disabled={changingCurrency}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} ({currency.symbol || currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>Display preference only. All values are calculated in USD internally, then converted for display.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {changingCurrency && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>

            <PortfolioVisualization
              summary={displaySummary}
              assetAllocation={displaySummary?.converted?.assetAllocation ?? displaySummary?.assetAllocation ?? []}
              baseCurrency={displaySummary?.baseCurrency || 'USD'}
              displayCurrency={baseCurrency}
              hasConversion={hasConversion}
              formatCurrency={formatCurrency}
              isLoading={loading || pricesLoading}
            />
          </div>
        )
      })()}

      {/* Tabs for Accounts, Holdings, Transactions */}
      <Tabs defaultValue="accounts">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          <TabsTrigger value="accounts" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Accounts ({portfolio?.accounts?.length || 0})</span>
            <span className="sm:hidden">Acct</span>
          </TabsTrigger>
          <TabsTrigger value="holdings" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <PieChart className="h-4 w-4 shrink-0" />
            <span>Holdings</span>
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Allocation</span>
            <span className="sm:hidden">Alloc</span>
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
            onClick={() => {
              if (transactions.length === 0) {
                fetchTransactions(1, true)
              }
              if (!bankSummary && !bankSummaryLoading) {
                fetchBankSummary()
              }
            }}
          >
            <History className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Transactions</span>
            <span className="sm:hidden">Trans</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <Calculator className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tax Reports</span>
            <span className="sm:hidden">Tax</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          {(() => {
            // Get portfolio baseCurrency for display conversion
            const baseCurrency = displaySummary?.baseCurrency || portfolio?.baseCurrency || 'USD'

            // Filter accounts by global filter
            const accountsToShow = globalAccountFilter
              ? portfolio?.accounts?.filter((a: any) => a.id === globalAccountFilter)
              : portfolio?.accounts

            if (!accountsToShow || accountsToShow.length === 0) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">
                        {globalAccountFilter ? "Account not found" : "No accounts yet"}
                      </h3>
                      <p className="text-muted-foreground mt-2">
                        {globalAccountFilter
                          ? "The selected account could not be found"
                          : "Add your first account to start tracking holdings"}
                      </p>
                      {!globalAccountFilter && (
                        <Button
                          className="mt-4"
                          onClick={() => setIsAddAccountOpen(true)}
                        >
                          Add Account
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            }

            return (
              <div className="space-y-4">
                {/* Closed positions toggle for accounts */}
                {(() => {
                  const allHoldings = accountsToShow?.flatMap((a: any) => a.holdings) || []
                  const closedCount = allHoldings.filter((h: any) => Number(h.quantity) === 0).length
                  if (closedCount === 0) return null
                  return (
                    <div className="flex items-center justify-end">
                      <Button
                        size="sm"
                        variant={showClosedPositions ? "default" : "outline"}
                        className={showClosedPositions ? "" : "text-muted-foreground"}
                        onClick={() => setShowClosedPositions(!showClosedPositions)}
                      >
                        {showClosedPositions ? "Hide" : "Show"} Closed ({closedCount})
                      </Button>
                    </div>
                  )
                })()}
                <div className="grid gap-4 md:grid-cols-2">
                  {accountsToShow?.map((account: any) => {
                    const isExpanded = expandedAccounts.has(account.id)
                    const filteredHoldings = showClosedPositions
                      ? account.holdings
                      : account.holdings?.filter((h: any) => Number(h.quantity) > 0) || []
                    const accountSummary = calculateAccountSummary(account)

                    // Convert account values to portfolio baseCurrency if different
                    const needsConversion = baseCurrency !== account.currency
                    const conversionRate = needsConversion
                      ? (exchangeRates[account.currency] || 1) / (exchangeRates[baseCurrency] || 1)
                      : 1
                    const displayTotalValue = accountSummary.totalValue * conversionRate
                    const displayGainLoss = accountSummary.gainLoss * conversionRate

                    return (
                      <Card
                        key={account.id}
                        className={`transition-all duration-200 ${
                          isExpanded
                            ? "border-primary/50 shadow-md"
                            : "hover:shadow-md"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-lg truncate">{account.name}</CardTitle>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {account.currency}
                                </Badge>
                              </div>
                              <CardDescription className="mt-1">
                                {account.institution} -{" "}
                                {ACCOUNT_TYPES.find((t) => t.value === account.accountType)
                                  ?.label || account.accountType}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteAccount(account.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleAccountExpanded(account.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <Pencil className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          {/* Summary section - always visible */}
                          <div className={isExpanded ? "pb-4 mb-4 border-b" : ""}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={isExpanded ? "text-xl font-bold" : "text-2xl font-bold"}>
                                  {formatCurrency(displayTotalValue, baseCurrency)}
                                </p>
                                {needsConversion && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(accountSummary.totalValue, account.currency)}
                                  </p>
                                )}
                                {accountSummary.hasSecurities && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {displayGainLoss >= 0 ? (
                                      <TrendingUp className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className={displayGainLoss >= 0 ? "text-green-500" : "text-red-500"}>
                                      {displayGainLoss >= 0 ? "+" : ""}
                                      {formatCurrency(Math.abs(displayGainLoss), baseCurrency)}
                                    </span>
                                    <span className={`text-sm ${displayGainLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                                      ({displayGainLoss >= 0 ? "+" : ""}{accountSummary.gainLossPercent.toFixed(2)}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                              {!isExpanded && (
                                <span className="text-sm text-muted-foreground">
                                  {accountSummary.holdingCount} holding{accountSummary.holdingCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expanded holdings section */}
                          {isExpanded && (
                            <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                              {filteredHoldings.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  {account.holdings?.length > 0
                                    ? "All positions closed"
                                    : "No holdings in this account"}
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {filteredHoldings.map((holding: any) => {
                                    const quantity = Number(holding.quantity)
                                    const costBasis = holding.costBasis
                                      ? Number(holding.costBasis)
                                      : 0
                                    const isCash = holding.symbol.startsWith("CASH.")

                                    // Determine holding's native currency and value
                                    const holdingNativeCurrency = isCash
                                      ? holding.symbol.split('.')[1] || 'USD'
                                      : holding.currency || account.currency || 'USD'
                                    const nativeValue = isCash ? quantity : costBasis

                                    // Convert to baseCurrency if different
                                    const holdingNeedsConversion = baseCurrency !== holdingNativeCurrency
                                    const holdingConversionRate = holdingNeedsConversion
                                      ? (exchangeRates[holdingNativeCurrency] || 1) / (exchangeRates[baseCurrency] || 1)
                                      : 1
                                    const convertedValue = nativeValue * holdingConversionRate

                                    return (
                                      <div
                                        key={holding.id}
                                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                      >
                                        <div>
                                          <p className="font-medium">{holding.symbol}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {isCash
                                              ? "Cash balance"
                                              : `${quantity.toFixed(holding.assetType === "CRYPTO" ? 8 : 2)} shares`}
                                          </p>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                          <div>
                                            <p className="text-sm font-medium">
                                              {formatCurrency(convertedValue, baseCurrency)}
                                            </p>
                                            {holdingNeedsConversion && (
                                              <p className="text-xs text-muted-foreground">
                                                {formatCurrency(nativeValue, holdingNativeCurrency)}
                                              </p>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-destructive"
                                            onClick={() => handleDeleteHolding(holding.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </TabsContent>

        <TabsContent value="holdings" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {(() => {
                // Filter accounts by global filter first
                const accountsToShow = globalAccountFilter
                  ? portfolio?.accounts?.filter((a: any) => a.id === globalAccountFilter)
                  : portfolio?.accounts

                const allHoldings =
                  accountsToShow?.flatMap((a: any) =>
                    a.holdings.map((h: any) => ({
                      ...h,
                      accountName: a.name,
                      accountCurrency: a.currency,
                    }))
                  ) || []

                // Filter based on showClosedPositions
                const displayedHoldings = showClosedPositions
                  ? allHoldings
                  : allHoldings.filter((h: any) => Number(h.quantity) > 0)

                // Split holdings into securities and cash
                const securitiesHoldings = displayedHoldings.filter(
                  (h: any) => !h.symbol.startsWith("CASH.")
                )
                const cashHoldings = displayedHoldings.filter(
                  (h: any) => h.symbol.startsWith("CASH.")
                )

                // Only count closed securities (not cash)
                const closedCount = allHoldings.filter(
                  (h: any) => Number(h.quantity) === 0 && !h.symbol.startsWith("CASH.")
                ).length

                // Get display currency for conversions
                const baseCurrency = displaySummary?.baseCurrency || portfolio?.baseCurrency || 'USD'

                if (allHoldings.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <DollarSign className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No holdings yet</h3>
                      <p className="text-muted-foreground mt-2">
                        Add holdings to your accounts to see them here
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {/* Securities Section */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Securities ({securitiesHoldings.length} {securitiesHoldings.length === 1 ? 'holding' : 'holdings'})
                        {closedCount > 0 && !showClosedPositions && (
                          <span className="font-normal"> · {closedCount} closed hidden</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4">
                        <PriceStatus lastRefresh={lastPriceRefresh} />
                        {closedCount > 0 && (
                          <Button
                            size="sm"
                            variant={showClosedPositions ? "default" : "outline"}
                            className={showClosedPositions ? "" : "text-muted-foreground"}
                            onClick={() => setShowClosedPositions(!showClosedPositions)}
                          >
                            {showClosedPositions ? "Hide" : "Show"} Closed ({closedCount})
                          </Button>
                        )}
                      </div>
                    </div>

                    {securitiesHoldings.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground border rounded-md">
                        No securities holdings
                      </div>
                    ) : (
                    <div className="overflow-x-auto -mx-4 md:mx-0">
                      <div className="inline-block min-w-full align-middle px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Symbol</TableHead>
                          <TableHead className="whitespace-nowrap hidden md:table-cell max-w-[200px]">Name</TableHead>
                          <TableHead className="whitespace-nowrap hidden lg:table-cell">Type</TableHead>
                          <TableHead className="whitespace-nowrap hidden lg:table-cell">Account</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Qty</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Price</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Value</TableHead>
                          <TableHead className="text-right whitespace-nowrap hidden md:table-cell">Cost</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Gain/Loss</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securitiesHoldings.map((holding: any) => {
                          const quantity = Number(holding.quantity)
                          const costBasis = holding.costBasis ? Number(holding.costBasis) : 0
                          const priceInfo = prices[holding.id]
                          const currentPrice = priceInfo?.price || 0
                          const marketValue = quantity * currentPrice
                          const gainLoss = costBasis > 0 ? marketValue - costBasis : 0
                          const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
                          const hasPrice = currentPrice > 0

                          return (
                            <TableRow key={holding.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {holding.symbol}
                              </TableCell>
                              <TableCell className="hidden md:table-cell max-w-[200px] truncate" title={holding.name}>{holding.name}</TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge variant="outline">
                                  {ASSET_TYPES.find((t) => t.value === holding.assetType)
                                    ?.label || holding.assetType}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">{holding.accountName}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {quantity.toFixed(
                                  holding.assetType === "CRYPTO" ? 8 : 2
                                )}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {hasPrice ? (
                                  formatCurrency(currentPrice, holding.accountCurrency)
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {hasPrice ? (
                                  formatCurrency(marketValue, holding.accountCurrency)
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                                {costBasis > 0
                                  ? formatCurrency(costBasis, holding.accountCurrency)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {hasPrice && costBasis > 0 ? (
                                  <div className={`flex items-center justify-end gap-1 ${
                                    gainLoss >= 0 ? "text-green-500" : "text-red-500"
                                  }`}>
                                    {gainLoss >= 0 ? (
                                      <TrendingUp className="h-3 w-3 hidden sm:inline" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 hidden sm:inline" />
                                    )}
                                    <span>
                                      {formatCurrency(Math.abs(gainLoss), holding.accountCurrency)}
                                    </span>
                                    <span className="text-xs hidden sm:inline">
                                      ({gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                      </div>
                    </div>
                    )}

                    {/* Cash Holdings Section */}
                    {cashHoldings.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Cash Holdings ({cashHoldings.length} {cashHoldings.length === 1 ? 'currency' : 'currencies'})
                        </h3>
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                          <div className="inline-block min-w-full align-middle px-4 md:px-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Currency</TableHead>
                                  <TableHead className="text-right">Balance</TableHead>
                                  <TableHead className="text-right">Value ({baseCurrency})</TableHead>
                                  <TableHead className="hidden md:table-cell">Account</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cashHoldings.map((holding: any) => {
                                  const currency = holding.symbol.replace("CASH.", "")
                                  const balance = Number(holding.quantity)

                                  // Convert to display currency using standard conversion pattern
                                  const conversionRate = currency !== baseCurrency && exchangeRates
                                    ? (exchangeRates[currency] || 1) / (exchangeRates[baseCurrency] || 1)
                                    : 1
                                  const valueInBaseCurrency = balance * conversionRate

                                  return (
                                    <TableRow key={holding.id}>
                                      <TableCell className="font-medium">{currency}</TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(balance, currency)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(valueInBaseCurrency, baseCurrency)}
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell">
                                        {holding.accountName}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Asset Allocation
                {globalAccountFilter && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({portfolio?.accounts?.find((a: any) => a.id === globalAccountFilter)?.name})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Breakdown of your {globalAccountFilter ? "account" : "portfolio"} by asset type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Use converted allocation if available, otherwise use base allocation
                const displayAllocation = displaySummary?.converted?.assetAllocation ?? displaySummary?.assetAllocation;
                return displayAllocation?.length > 0 ? (
                  <div className="space-y-4">
                    {displayAllocation.map((item: any) => (
                      <div key={item.assetType} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            {ASSET_TYPES.find((t) => t.value === item.assetType)
                              ?.label || item.assetType}
                          </span>
                          <span>
                            {formatCurrency(item.value, portfolio?.baseCurrency)} (
                            {item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <PieChart className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Add holdings to see your asset allocation
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <div className="mt-6">
            <PerformanceChart
              portfolioId={portfolioId}
              formatCurrency={formatCurrency}
              baseCurrency={portfolio?.baseCurrency || "USD"}
            />
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All transactions across your portfolio accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Bank Account Summary - Income vs Expenses */}
              <BankSummary
                data={bankSummary}
                currency={portfolio?.baseCurrency || "USD"}
                formatCurrency={formatCurrency}
                isLoading={bankSummaryLoading}
              />

              {/* Realized Gains Summary */}
              {realizedGainsSummary && realizedGainsSummary.totalRealizedGain !== 0 && (() => {
                // Apply currency conversion if portfolio uses non-USD base currency
                const exchangeRate = summary?.converted?.exchangeRate ?? 1;
                const totalGain = realizedGainsSummary.totalRealizedGain * exchangeRate;
                const shortTermGain = realizedGainsSummary.shortTermGain * exchangeRate;
                const longTermGain = realizedGainsSummary.longTermGain * exchangeRate;

                return (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-6">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Realized Gain/Loss</p>
                      <p
                        className={`text-2xl font-bold ${
                          totalGain >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {totalGain >= 0 ? "+" : ""}
                        {formatCurrency(totalGain, portfolio?.baseCurrency)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Short-Term (&lt;1 year)</p>
                      <p
                        className={`text-xl font-semibold ${
                          shortTermGain >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {shortTermGain >= 0 ? "+" : ""}
                        {formatCurrency(shortTermGain, portfolio?.baseCurrency)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Long-Term (&ge;1 year)</p>
                      <p
                        className={`text-xl font-semibold ${
                          longTermGain >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {longTermGain >= 0 ? "+" : ""}
                        {formatCurrency(longTermGain, portfolio?.baseCurrency)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Filters */}
              <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:gap-4 mb-6">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={transactionFilters.type}
                    onValueChange={(v) => {
                      setTransactionFilters({ ...transactionFilters, type: v === "all" ? "" : v })
                      fetchTransactions(1, false)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="SELL">Sell</SelectItem>
                      <SelectItem value="DIVIDEND">Dividend</SelectItem>
                      <SelectItem value="REINVEST_DIVIDEND">Reinvest Dividend</SelectItem>
                      <SelectItem value="INTEREST">Interest</SelectItem>
                      <SelectItem value="TAX_WITHHOLDING">Tax Withholding</SelectItem>
                      <SelectItem value="FEE">Fee</SelectItem>
                      <SelectItem value="DEPOSIT">Deposit</SelectItem>
                      <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                      <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                      <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                      <SelectItem value="FOREX">Forex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Symbol</Label>
                  <Input
                    placeholder="Search..."
                    className="w-full md:w-32"
                    value={transactionFilters.symbol}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        symbol: e.target.value.toUpperCase(),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        fetchTransactions(1, false)
                      }
                    }}
                  />
                </div>

                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label className="text-xs">Account</Label>
                  <Select
                    value={transactionFilters.accountId}
                    onValueChange={(v) => {
                      setTransactionFilters({ ...transactionFilters, accountId: v === "all" ? "" : v })
                      fetchTransactions(1, false)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {portfolio?.accounts?.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={transactionFilters.category}
                    onValueChange={(v) => {
                      setTransactionFilters({ ...transactionFilters, category: v === "all" ? "" : v })
                      fetchTransactions(1, false)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="SALARY">Salary</SelectItem>
                      <SelectItem value="RENTAL_INCOME">Rental Income</SelectItem>
                      <SelectItem value="INVESTMENT_INCOME">Investment Income</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                      <SelectItem value="OTHER_INCOME">Other Income</SelectItem>
                      <SelectItem value="RENT">Rent</SelectItem>
                      <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                      <SelectItem value="WATER_SEWER">Water/Sewer</SelectItem>
                      <SelectItem value="INTERNET">Internet</SelectItem>
                      <SelectItem value="HOME_MAINTENANCE">Home Maintenance</SelectItem>
                      <SelectItem value="HOME_SUPPLIES">Home Supplies</SelectItem>
                      <SelectItem value="AUTO_INSURANCE">Auto Insurance</SelectItem>
                      <SelectItem value="FUEL">Fuel</SelectItem>
                      <SelectItem value="PARKING">Parking</SelectItem>
                      <SelectItem value="PUBLIC_TRANSIT">Public Transit</SelectItem>
                      <SelectItem value="HEALTH_INSURANCE">Health Insurance</SelectItem>
                      <SelectItem value="DOCTOR_DENTIST">Doctor/Dentist</SelectItem>
                      <SelectItem value="MEDICINE">Medicine</SelectItem>
                      <SelectItem value="GROCERIES">Groceries</SelectItem>
                      <SelectItem value="DINING">Dining</SelectItem>
                      <SelectItem value="CLOTHING">Clothing</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                      <SelectItem value="STREAMING">Streaming</SelectItem>
                      <SelectItem value="SOFTWARE">Software</SelectItem>
                      <SelectItem value="MEMBERSHIPS">Memberships</SelectItem>
                      <SelectItem value="BANK_FEES">Bank Fees</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="INVESTMENT">Investment</SelectItem>
                      <SelectItem value="UNCATEGORIZED">Uncategorized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    className="w-full md:w-36"
                    value={transactionFilters.startDate}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    className="w-full md:w-36"
                    value={transactionFilters.endDate}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <Label className="text-xs hidden md:block">&nbsp;</Label>
                  <Button
                    size="sm"
                    variant={transactionFilters.hasFees ? "default" : "outline"}
                    className={`w-full md:w-auto ${transactionFilters.hasFees ? "" : "text-muted-foreground"}`}
                    onClick={() => {
                      const newValue = !transactionFilters.hasFees
                      setTransactionFilters({ ...transactionFilters, hasFees: newValue })
                      fetchTransactions(1, false)
                    }}
                  >
                    {transactionFilters.hasFees ? "Has Fees" : "Has Fees"}
                  </Button>
                </div>

                <div className="flex items-end gap-2 col-span-2 md:col-span-1">
                  <Button
                    size="sm"
                    className="flex-1 md:flex-none"
                    onClick={() => fetchTransactions(1, false)}
                    disabled={transactionsLoading}
                  >
                    {transactionsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 md:flex-none"
                    onClick={() => {
                      setTransactionFilters({
                        type: "",
                        symbol: "",
                        startDate: "",
                        endDate: "",
                        accountId: "",
                        hasFees: false,
                        category: "",
                      })
                      fetchTransactions(1, false)
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Transactions Table */}
              {transactionsLoading && transactions.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No transactions</h3>
                  <p className="text-muted-foreground mt-2">
                    {transactionFilters.type ||
                    transactionFilters.symbol ||
                    transactionFilters.startDate ||
                    transactionFilters.endDate ||
                    transactionFilters.accountId ||
                    transactionFilters.hasFees
                      ? "No transactions match your filters"
                      : "Import transactions to see them here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <div className="inline-block min-w-full align-middle px-4 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap">Symbol</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">Account</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden md:table-cell">Qty</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden lg:table-cell">Price</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden xl:table-cell">Cost Basis</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden md:table-cell">Realized G/L</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden xl:table-cell">Days Held</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden lg:table-cell">Fees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx: any) => {
                        const amount = Number(tx.amount)
                        const isPositive = amount >= 0
                        const typeColors: Record<string, string> = {
                          BUY: "bg-blue-500/10 text-blue-600",
                          SELL: "bg-green-500/10 text-green-600",
                          DIVIDEND: "bg-emerald-500/10 text-emerald-600",
                          REINVEST_DIVIDEND: "bg-teal-500/10 text-teal-600",
                          INTEREST: "bg-cyan-500/10 text-cyan-600",
                          TAX_WITHHOLDING: "bg-red-500/10 text-red-600",
                          FEE: "bg-orange-500/10 text-orange-600",
                          DEPOSIT: "bg-green-500/10 text-green-600",
                          WITHDRAWAL: "bg-amber-500/10 text-amber-600",
                          TRANSFER_IN: "bg-purple-500/10 text-purple-600",
                          TRANSFER_OUT: "bg-violet-500/10 text-violet-600",
                          FOREX: "bg-indigo-500/10 text-indigo-600",
                        }

                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(tx.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${typeColors[tx.type] || ""}`}
                              >
                                {tx.type.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium whitespace-nowrap">
                              {tx.symbol || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden lg:table-cell">
                              {tx.account?.name || "-"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap hidden md:table-cell">
                              {tx.quantity ? Number(tx.quantity).toFixed(4) : "-"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap hidden lg:table-cell">
                              {tx.price
                                ? formatCurrency(Number(tx.price), tx.currency)
                                : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium whitespace-nowrap ${
                                isPositive ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatCurrency(amount, tx.currency)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap hidden xl:table-cell">
                              {tx.costBasisUsed
                                ? formatCurrency(Number(tx.costBasisUsed), tx.currency)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap hidden md:table-cell">
                              {tx.realizedGainLoss !== null && tx.realizedGainLoss !== undefined ? (
                                <span
                                  className={`font-medium ${
                                    Number(tx.realizedGainLoss) >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {Number(tx.realizedGainLoss) >= 0 ? "+" : ""}
                                  {formatCurrency(Number(tx.realizedGainLoss), tx.currency)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap hidden xl:table-cell">
                              {tx.holdingPeriodDays !== null && tx.holdingPeriodDays !== undefined ? (
                                <span title={tx.holdingPeriodDays >= 365 ? "Long-term" : "Short-term"}>
                                  {tx.holdingPeriodDays}d
                                  <span className="text-xs ml-1">
                                    {tx.holdingPeriodDays >= 365 ? "(LT)" : "(ST)"}
                                  </span>
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                              {tx.fees ? formatCurrency(Number(tx.fees), tx.currency) : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {transactionsTotal > transactionsLimit && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
                      <p className="text-sm text-muted-foreground text-center sm:text-left">
                        Showing {((transactionsPage - 1) * transactionsLimit) + 1}-
                        {Math.min(transactionsPage * transactionsLimit, transactionsTotal)} of{" "}
                        {transactionsTotal}
                      </p>
                      <div className="flex gap-2 justify-center sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={transactionsPage === 1 || transactionsLoading}
                          onClick={() => fetchTransactions(transactionsPage - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            transactionsPage * transactionsLimit >= transactionsTotal ||
                            transactionsLoading
                          }
                          onClick={() => fetchTransactions(transactionsPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab
            portfolioId={portfolioId}
            isDemo={session?.user?.isDemo}
          />
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <TaxReportView
            portfolioId={portfolioId}
            formatCurrency={formatCurrency}
            baseCurrency={portfolio?.baseCurrency || "USD"}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
