"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts"
import { Loader2, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react"

interface SnapshotData {
  date: string
  totalValue: number
  costBasis: number
  cashValue: number
  gainLoss: number
  gainLossPct: number
}

interface PerformanceData {
  startValue: number
  endValue: number
  absoluteChange: number
  percentChange: number
}

interface PerformanceChartProps {
  portfolioId: string
  formatCurrency: (value: number, currency: string) => string
  baseCurrency?: string
}

const PERIODS = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "YTD", label: "YTD" },
  { value: "ALL", label: "All" },
] as const

type Period = (typeof PERIODS)[number]["value"]

export function PerformanceChart({
  portfolioId,
  formatCurrency,
  baseCurrency = "USD",
}: PerformanceChartProps) {
  const [period, setPeriod] = useState<Period>("1Y")
  const [loading, setLoading] = useState(true)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [dataPoints, setDataPoints] = useState<SnapshotData[]>([])
  const [performance, setPerformance] = useState<PerformanceData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/portfolio/${portfolioId}/history?period=${period}`
      )
      if (response.ok) {
        const data = await response.json()
        setDataPoints(data.dataPoints || [])
        setPerformance(data.performance)
      } else {
        setError("Failed to load chart data")
      }
    } catch (err) {
      console.error("Error fetching history:", err)
      setError("Failed to load chart data")
    } finally {
      setLoading(false)
    }
  }

  const createSnapshot = async () => {
    setSnapshotLoading(true)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/history`, {
        method: "POST",
      })
      if (response.ok) {
        // Refresh data after creating snapshot
        await fetchHistory()
      }
    } catch (err) {
      console.error("Error creating snapshot:", err)
    } finally {
      setSnapshotLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [portfolioId, period])

  // Format data for chart
  const chartData = dataPoints.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    fullDate: new Date(d.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  }))

  // Calculate chart domain
  const values = chartData.map((d) => d.totalValue)
  const minValue = Math.min(...values) * 0.98
  const maxValue = Math.max(...values) * 1.02

  // Get first value for reference line
  const firstValue = chartData[0]?.totalValue || 0

  // Determine if overall performance is positive
  const isPositive = performance ? performance.percentChange >= 0 : true

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (dataPoints.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
          <CardDescription>Historical portfolio value over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Historical Data</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Historical snapshots are used to track portfolio performance over time.
              Create a snapshot to start tracking.
            </p>
            <Button
              onClick={createSnapshot}
              disabled={snapshotLoading}
              className="mt-4"
            >
              {snapshotLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Create Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base">Portfolio Performance</CardTitle>
            <CardDescription>Historical portfolio value over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    period === p.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={createSnapshot}
              disabled={snapshotLoading}
            >
              {snapshotLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Summary */}
        {performance && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <span
                className={`text-2xl font-bold ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : ""}
                {performance.percentChange.toFixed(2)}%
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {isPositive ? "+" : ""}
              {formatCurrency(performance.absoluteChange, baseCurrency)}
            </Badge>
          </div>
        )}

        {/* Chart */}
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? "#22c55e" : "#ef4444"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? "#22c55e" : "#ef4444"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickMargin={8}
                minTickGap={30}
              />
              <YAxis
                domain={[minValue, maxValue]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    compactDisplay: "short",
                    maximumFractionDigits: 0,
                  }).format(value)
                }
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium mb-1">{data.fullDate}</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(data.totalValue, baseCurrency)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-sm ${
                              data.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {data.gainLoss >= 0 ? "+" : ""}
                            {formatCurrency(data.gainLoss, baseCurrency)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({data.gainLossPct >= 0 ? "+" : ""}
                            {data.gainLossPct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                y={firstValue}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="transparent"
                fill="url(#colorValue)"
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: isPositive ? "#22c55e" : "#ef4444",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Data Points Info */}
        <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
          <span>{dataPoints.length} data points</span>
          <span>
            Last updated:{" "}
            {new Date(dataPoints[dataPoints.length - 1]?.date).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
