"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { TaxReport, Form8949Row } from "@/lib/tax/types"

interface TaxReportViewProps {
  portfolioId: string
  formatCurrency: (value: number, currency: string) => string
  baseCurrency?: string
}

export function TaxReportView({
  portfolioId,
  formatCurrency,
  baseCurrency = "USD",
}: TaxReportViewProps) {
  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [report, setReport] = useState<TaxReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [yearsLoading, setYearsLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // Fetch available years on mount
  useEffect(() => {
    async function fetchYears() {
      setYearsLoading(true)
      try {
        const response = await fetch(
          `/api/portfolio/${portfolioId}/tax-report?action=years`
        )
        if (response.ok) {
          const data = await response.json()
          setYears(data.years || [])
          // Auto-select most recent year
          if (data.years?.length > 0) {
            setSelectedYear(data.years[0])
          }
        }
      } catch (err) {
        console.error("Error fetching tax years:", err)
      } finally {
        setYearsLoading(false)
      }
    }
    fetchYears()
  }, [portfolioId])

  // Fetch report when year changes
  useEffect(() => {
    if (!selectedYear) return

    async function fetchReport() {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/portfolio/${portfolioId}/tax-report?year=${selectedYear}`
        )
        if (response.ok) {
          const data = await response.json()
          setReport(data)
        }
      } catch (err) {
        console.error("Error fetching tax report:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [portfolioId, selectedYear])

  const handleDownloadCSV = async () => {
    if (!selectedYear) return

    setDownloading(true)
    try {
      const response = await fetch(
        `/api/portfolio/${portfolioId}/tax-report?year=${selectedYear}&format=csv`
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Form8949_${selectedYear}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error("Error downloading CSV:", err)
    } finally {
      setDownloading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  if (yearsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (years.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Tax Data Available</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Tax reports are generated from realized gains when you sell holdings.
              No sales have been recorded yet.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with year selector and download */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Tax Year:</span>
          <Select
            value={selectedYear?.toString() || ""}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleDownloadCSV}
          disabled={!report || downloading}
          variant="outline"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download Form 8949 CSV
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm font-medium">Short-Term Gain/Loss</span>
                  <Badge variant="secondary" className="text-xs">
                    {report.shortTermCount} sales
                  </Badge>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    report.form8949.summary.shortTermGainLoss >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {report.form8949.summary.shortTermGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(report.form8949.summary.shortTermGainLoss, baseCurrency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Held 1 year or less
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm font-medium">Long-Term Gain/Loss</span>
                  <Badge variant="secondary" className="text-xs">
                    {report.longTermCount} sales
                  </Badge>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    report.form8949.summary.longTermGainLoss >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {report.form8949.summary.longTermGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(report.form8949.summary.longTermGainLoss, baseCurrency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Held more than 1 year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">
                  <span className="text-sm font-medium">Total Gain/Loss</span>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    report.form8949.summary.totalGainLoss >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {report.form8949.summary.totalGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(report.form8949.summary.totalGainLoss, baseCurrency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.transactionCount} total sales
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Schedule D Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Schedule D Summary</CardTitle>
              <CardDescription>
                Capital Gains and Losses for tax year {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Part I: Short-Term</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proceeds:</span>
                      <span>{formatCurrency(report.form8949.summary.shortTermProceeds, baseCurrency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Basis:</span>
                      <span>{formatCurrency(report.form8949.summary.shortTermCostBasis, baseCurrency)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Net Short-Term (Line 7):</span>
                      <span className={report.scheduleD.line7 >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(report.scheduleD.line7, baseCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Part II: Long-Term</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proceeds:</span>
                      <span>{formatCurrency(report.form8949.summary.longTermProceeds, baseCurrency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Basis:</span>
                      <span>{formatCurrency(report.form8949.summary.longTermCostBasis, baseCurrency)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Net Long-Term (Line 15):</span>
                      <span className={report.scheduleD.line15 >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(report.scheduleD.line15, baseCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form 8949 Details */}
          {report.form8949.partI.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Form 8949 Part I - Short-Term Transactions
                </CardTitle>
                <CardDescription>
                  Capital assets held 1 year or less
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionTable
                  rows={report.form8949.partI}
                  formatCurrency={formatCurrency}
                  baseCurrency={baseCurrency}
                  formatDate={formatDate}
                />
              </CardContent>
            </Card>
          )}

          {report.form8949.partII.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Form 8949 Part II - Long-Term Transactions
                </CardTitle>
                <CardDescription>
                  Capital assets held more than 1 year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionTable
                  rows={report.form8949.partII}
                  formatCurrency={formatCurrency}
                  baseCurrency={baseCurrency}
                  formatDate={formatDate}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}

// Transaction table component
function TransactionTable({
  rows,
  formatCurrency,
  baseCurrency,
  formatDate,
}: {
  rows: Form8949Row[]
  formatCurrency: (value: number, currency: string) => string
  baseCurrency: string
  formatDate: (date: Date | string) => string
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="hidden sm:table-cell">Acquired</TableHead>
            <TableHead className="hidden sm:table-cell">Sold</TableHead>
            <TableHead className="text-right">Proceeds</TableHead>
            <TableHead className="text-right hidden md:table-cell">Cost Basis</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.transactionId}>
              <TableCell>
                <div>
                  <span className="font-medium">{row.symbol}</span>
                  <span className="text-muted-foreground ml-1">
                    ({row.quantity} sh)
                  </span>
                </div>
                <div className="text-xs text-muted-foreground sm:hidden">
                  {formatDate(row.dateAcquired)} → {formatDate(row.dateSold)}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {formatDate(row.dateAcquired)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {formatDate(row.dateSold)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.proceeds, baseCurrency)}
              </TableCell>
              <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                {formatCurrency(row.costBasis, baseCurrency)}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-medium ${
                    row.gainOrLoss >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {row.gainOrLoss >= 0 ? "+" : ""}
                  {formatCurrency(row.gainOrLoss, baseCurrency)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
