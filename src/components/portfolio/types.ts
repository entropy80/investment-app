/**
 * Type definitions for portfolio visualization components
 */

export interface AssetAllocationItem {
  assetType: string
  value: number
  percentage: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalGainLoss: number
  totalGainLossPercent: number
  accountCount: number
  holdingCount: number
  baseCurrency: string
  assetAllocation: AssetAllocationItem[]
  converted?: {
    totalValue: number
    totalCostBasis: number
    totalGainLoss: number
    exchangeRate: number
    rateDate?: Date
    assetAllocation: AssetAllocationItem[]
  }
}

export interface ChartLegendItem {
  label: string
  color: string
  value: number
  percentage: number
}

export interface PortfolioVisualizationProps {
  summary: PortfolioSummary | null
  assetAllocation: AssetAllocationItem[]
  baseCurrency: string
  displayCurrency: string
  hasConversion: boolean
  formatCurrency: (value: number, currency: string) => string
  isLoading?: boolean
}

export interface AssetAllocationChartProps {
  data: AssetAllocationItem[]
  formatCurrency: (value: number, currency: string) => string
  currency: string
}

export interface PortfolioBreakdownProps {
  investedCapital: number
  unrealizedGainLoss: number
  gainLossPercent: number
  securitiesValue: number
  cashHoldings: number
  totalValue: number
  baseCurrency: string
  formatCurrency: (value: number, currency: string) => string
  hasConversion?: boolean
  convertedValues?: {
    investedCapital: number
    unrealizedGainLoss: number
    securitiesValue: number
    cashHoldings: number
    totalValue: number
  }
}

export interface ChartLegendProps {
  items: ChartLegendItem[]
  formatCurrency: (value: number, currency: string) => string
  currency: string
  layout?: 'horizontal' | 'vertical' | 'grid'
}
