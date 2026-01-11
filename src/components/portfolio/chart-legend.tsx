'use client'

import { cn } from '@/lib/utils'
import type { ChartLegendProps } from './types'

export function ChartLegend({
  items,
  formatCurrency,
  currency,
  layout = 'vertical',
}: ChartLegendProps) {
  return (
    <div
      className={cn(
        'flex gap-2',
        layout === 'vertical' && 'flex-col',
        layout === 'horizontal' && 'flex-row flex-wrap justify-center',
        layout === 'grid' && 'grid grid-cols-2 gap-x-4 gap-y-2'
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-sm"
        >
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground truncate">
            {item.label}
          </span>
          <span className="ml-auto font-medium tabular-nums">
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
