/**
 * Chart color utilities for Recharts integration
 * Maps to CSS variables defined in globals.css
 */

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

/**
 * Get chart color by index, cycling through available colors
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * Asset type to readable label mapping
 */
export const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCK: 'Stocks',
  ETF: 'ETFs',
  MUTUAL_FUND: 'Mutual Funds',
  BOND: 'Bonds',
  CRYPTO: 'Crypto',
  CASH: 'Cash',
  REAL_ESTATE: 'Real Estate',
  COMMODITY: 'Commodities',
  OTHER: 'Other',
}

/**
 * Get human-readable label for asset type
 */
export function getAssetTypeLabel(assetType: string): string {
  return ASSET_TYPE_LABELS[assetType] || assetType
}
