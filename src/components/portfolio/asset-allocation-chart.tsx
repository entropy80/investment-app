'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getChartColor, getAssetTypeLabel } from '@/lib/chart-colors'
import { ChartLegend } from './chart-legend'
import type { AssetAllocationChartProps, ChartLegendItem } from './types'

export function AssetAllocationChart({
  data,
  formatCurrency,
  currency,
}: AssetAllocationChartProps) {
  // Transform data for chart
  const chartData = data.map((item, index) => ({
    name: getAssetTypeLabel(item.assetType),
    value: item.value,
    percentage: item.percentage,
    fill: getChartColor(index),
  }))

  // Prepare legend items
  const legendItems: ChartLegendItem[] = chartData.map((item) => ({
    label: item.name,
    color: item.fill,
    value: item.value,
    percentage: item.percentage,
  }))

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (!active || !payload?.length) return null
    const item = payload[0].payload
    return (
      <div className="bg-popover border rounded-md p-2 shadow-md">
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(item.value, currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.percentage.toFixed(1)}%
        </p>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No allocation data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">Asset Allocation</h3>
      <div className="h-[200px] lg:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={legendItems}
        formatCurrency={formatCurrency}
        currency={currency}
        layout="grid"
      />
    </div>
  )
}
