'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortfolioBreakdownProps } from './types'

interface BreakdownRowProps {
  label: string
  value: string
  secondaryValue?: string
  valueClassName?: string
  icon?: React.ReactNode
  sublabel?: string
  isTotal?: boolean
}

function BreakdownRow({
  label,
  value,
  secondaryValue,
  valueClassName,
  icon,
  sublabel,
  isTotal,
}: BreakdownRowProps) {
  return (
    <div className={cn('flex justify-between items-start gap-2', isTotal && 'font-bold')}>
      <span className={cn('text-sm', isTotal ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1">
          {icon && <span className={valueClassName}>{icon}</span>}
          <span className={cn('text-right tabular-nums', valueClassName, isTotal && 'text-base')}>
            {value}
          </span>
          {sublabel && (
            <span className={cn('text-xs', valueClassName)}>({sublabel})</span>
          )}
        </div>
        {secondaryValue && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {secondaryValue}
          </span>
        )}
      </div>
    </div>
  )
}

export function PortfolioBreakdown({
  investedCapital,
  unrealizedGainLoss,
  gainLossPercent,
  securitiesValue,
  cashHoldings,
  totalValue,
  baseCurrency,
  formatCurrency,
  hasConversion,
  convertedValues,
  realizedGains,
}: PortfolioBreakdownProps) {
  const isPositive = unrealizedGainLoss >= 0

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base">Portfolio Breakdown</h3>

      <div className="space-y-1.5">
        <BreakdownRow
          label="Invested Capital"
          value={formatCurrency(investedCapital, baseCurrency)}
          secondaryValue={hasConversion && convertedValues ? formatCurrency(convertedValues.investedCapital, 'USD') : undefined}
        />
        <BreakdownRow
          label="Unrealized Gain/Loss"
          value={`${isPositive ? '+' : ''}${formatCurrency(unrealizedGainLoss, baseCurrency)}`}
          secondaryValue={hasConversion && convertedValues ? `${isPositive ? '+' : ''}${formatCurrency(convertedValues.unrealizedGainLoss, 'USD')}` : undefined}
          valueClassName={isPositive ? 'text-green-500' : 'text-red-500'}
          icon={isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          sublabel={`${isPositive ? '+' : ''}${gainLossPercent.toFixed(2)}%`}
        />
        {realizedGains && realizedGains.total !== 0 && (
          <>
            <BreakdownRow
              label="Realized Gain/Loss"
              value={`${realizedGains.total >= 0 ? '+' : ''}${formatCurrency(realizedGains.total, baseCurrency)}`}
              valueClassName={realizedGains.total >= 0 ? 'text-green-500' : 'text-red-500'}
            />
            <div className="pl-4 space-y-1">
              <BreakdownRow
                label="Short-Term (<1yr)"
                value={`${realizedGains.shortTerm >= 0 ? '+' : ''}${formatCurrency(realizedGains.shortTerm, baseCurrency)}`}
                valueClassName={realizedGains.shortTerm >= 0 ? 'text-green-500/80' : 'text-red-500/80'}
              />
              <BreakdownRow
                label="Long-Term (≥1yr)"
                value={`${realizedGains.longTerm >= 0 ? '+' : ''}${formatCurrency(realizedGains.longTerm, baseCurrency)}`}
                valueClassName={realizedGains.longTerm >= 0 ? 'text-green-500/80' : 'text-red-500/80'}
              />
            </div>
          </>
        )}
        <BreakdownRow
          label="Securities Value"
          value={formatCurrency(securitiesValue, baseCurrency)}
          secondaryValue={hasConversion && convertedValues ? formatCurrency(convertedValues.securitiesValue, 'USD') : undefined}
        />
        <BreakdownRow
          label="Cash Holdings"
          value={formatCurrency(cashHoldings, baseCurrency)}
          secondaryValue={hasConversion && convertedValues ? formatCurrency(convertedValues.cashHoldings, 'USD') : undefined}
        />

        <div className="border-t pt-2 mt-2">
          <BreakdownRow
            label="Total Portfolio Value"
            value={formatCurrency(totalValue, baseCurrency)}
            secondaryValue={hasConversion && convertedValues ? formatCurrency(convertedValues.totalValue, 'USD') : undefined}
            isTotal
          />
        </div>
      </div>
    </div>
  )
}
