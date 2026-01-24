/**
 * HeroPortfolioMockup Component
 * Static mockup of the portfolio visualization for the landing page hero
 * Uses CSS conic-gradient for the donut chart (no Recharts dependency)
 */

import { TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Sample allocation data
const ALLOCATION_DATA = [
  { label: 'Stocks', percentage: 42, color: 'var(--chart-1)' },
  { label: 'ETFs', percentage: 28, color: 'var(--chart-2)' },
  { label: 'Crypto', percentage: 18, color: 'var(--chart-3)' },
  { label: 'Cash', percentage: 12, color: 'var(--chart-4)' },
]

// Generate conic-gradient from allocation data
function generateConicGradient(data: typeof ALLOCATION_DATA): string {
  let currentAngle = 0
  const segments = data.map((item) => {
    const startAngle = currentAngle
    currentAngle += (item.percentage / 100) * 360
    return `${item.color} ${startAngle}deg ${currentAngle}deg`
  })
  return `conic-gradient(${segments.join(', ')})`
}

function DonutChart() {
  const gradient = generateConicGradient(ALLOCATION_DATA)

  return (
    <div className="relative w-[160px] h-[160px] mx-auto">
      {/* Outer ring with gradient */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient }}
      />
      {/* Inner circle to create donut effect */}
      <div className="absolute inset-[30%] rounded-full bg-card" />
    </div>
  )
}

function ChartLegend() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
      {ALLOCATION_DATA.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground text-xs">{item.label}</span>
          <span className="ml-auto font-medium text-xs tabular-nums">
            {item.percentage}%
          </span>
        </div>
      ))}
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  valueClassName,
  isTotal,
}: {
  label: string
  value: string
  valueClassName?: string
  isTotal?: boolean
}) {
  return (
    <div className={`flex justify-between items-center gap-2 ${isTotal ? 'font-bold' : ''}`}>
      <span className={`text-xs ${isTotal ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className={`text-xs tabular-nums ${valueClassName || ''} ${isTotal ? 'text-sm' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function PortfolioBreakdown() {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">Portfolio Breakdown</h4>
      <div className="space-y-1.5">
        <BreakdownRow label="Invested Capital" value="$45,525" />
        <BreakdownRow
          label="Unrealized Gain/Loss"
          value="+$8,705 (19.1%)"
          valueClassName="text-green-500"
        />
        <BreakdownRow label="Securities Value" value="$46,030" />
        <BreakdownRow label="Cash Holdings" value="$8,200" />
        <div className="border-t pt-1.5 mt-1.5">
          <BreakdownRow label="Total Value" value="$54,230" isTotal />
        </div>
      </div>
    </div>
  )
}

export function HeroPortfolioMockup() {
  return (
    <div className="relative">
      <Card className="overflow-hidden border-2">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center justify-between">
            <span className="font-semibold text-sm">Portfolio Overview</span>
            <div className="flex items-center gap-1.5 text-green-500">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">+19.1%</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: Donut Chart */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Asset Allocation</h4>
                <DonutChart />
                <ChartLegend />
              </div>

              {/* Right: Breakdown */}
              <div className="sm:border-l sm:pl-4">
                <PortfolioBreakdown />
              </div>
            </div>
          </div>

          {/* Footer with currency badges */}
          <div className="border-t px-4 py-2.5 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Currencies:</span>
              {['USD', 'EUR', 'GBP'].map((currency) => (
                <span
                  key={currency}
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium"
                >
                  {currency}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decorative gradient */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur-xl -z-10" />
    </div>
  )
}
