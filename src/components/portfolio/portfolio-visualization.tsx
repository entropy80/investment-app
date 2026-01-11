'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AssetAllocationChart } from './asset-allocation-chart'
import { PortfolioBreakdown } from './portfolio-breakdown'
import type { PortfolioVisualizationProps } from './types'

export function PortfolioVisualization({
  summary,
  assetAllocation,
  baseCurrency,
  displayCurrency,
  hasConversion,
  formatCurrency,
  isLoading,
}: PortfolioVisualizationProps) {
  // Calculate cash holdings from asset allocation
  const cashAllocation = assetAllocation.find((item) => item.assetType === 'CASH')
  const cashHoldings = cashAllocation?.value || 0

  // Calculate securities value (total - cash)
  const totalValue = summary?.totalValue || 0
  const securitiesValue = totalValue - cashHoldings

  // Get display values (converted or base)
  const displayTotal = hasConversion && summary?.converted
    ? summary.converted.totalValue
    : totalValue

  const displayCostBasis = hasConversion && summary?.converted
    ? summary.converted.totalCostBasis
    : summary?.totalCostBasis || 0

  const displayGainLoss = hasConversion && summary?.converted
    ? summary.converted.totalGainLoss
    : summary?.totalGainLoss || 0

  // Calculate converted values for breakdown
  const convertedCashAllocation = hasConversion && summary?.converted
    ? summary.converted.assetAllocation.find((item) => item.assetType === 'CASH')
    : null
  const convertedCashHoldings = convertedCashAllocation?.value || 0
  const convertedSecuritiesValue = hasConversion && summary?.converted
    ? summary.converted.totalValue - convertedCashHoldings
    : 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-5 w-36" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            No portfolio data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Asset Allocation Chart - Left Section */}
          <div className="lg:col-span-3">
            <AssetAllocationChart
              data={hasConversion && summary.converted
                ? summary.converted.assetAllocation
                : assetAllocation
              }
              formatCurrency={formatCurrency}
              currency={displayCurrency}
            />
          </div>

          {/* Portfolio Breakdown - Right Section */}
          <div className="lg:col-span-2">
            <PortfolioBreakdown
              investedCapital={displayCostBasis}
              unrealizedGainLoss={displayGainLoss}
              gainLossPercent={summary.totalGainLossPercent || 0}
              securitiesValue={hasConversion ? convertedSecuritiesValue : securitiesValue}
              cashHoldings={hasConversion ? convertedCashHoldings : cashHoldings}
              totalValue={displayTotal}
              baseCurrency={displayCurrency}
              formatCurrency={formatCurrency}
              hasConversion={hasConversion}
              convertedValues={hasConversion ? {
                investedCapital: summary.totalCostBasis,
                unrealizedGainLoss: summary.totalGainLoss,
                securitiesValue: securitiesValue,
                cashHoldings: cashHoldings,
                totalValue: summary.totalValue,
              } : undefined}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
