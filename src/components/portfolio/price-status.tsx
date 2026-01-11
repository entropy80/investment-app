"use client"

import { useMemo } from "react"
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface PriceStatusProps {
  lastRefresh: Date | null
  className?: string
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  }
  return "Just now"
}

/**
 * Determines the status level based on how stale the prices are
 */
function getStatusLevel(lastRefresh: Date | null): "fresh" | "stale" | "warning" | "unknown" {
  if (!lastRefresh) return "unknown"

  const now = new Date()
  const diffMs = now.getTime() - lastRefresh.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 4) return "fresh"
  if (diffHours < 24) return "stale"
  return "warning"
}

export function PriceStatus({ lastRefresh, className }: PriceStatusProps) {
  const statusLevel = useMemo(() => getStatusLevel(lastRefresh), [lastRefresh])
  const timeAgo = useMemo(() => {
    if (!lastRefresh) return "Never"
    return formatDuration(new Date().getTime() - lastRefresh.getTime())
  }, [lastRefresh])

  const statusConfig = {
    fresh: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      label: "Prices current",
    },
    stale: {
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      label: "Prices may be stale",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      label: "Prices outdated",
    },
    unknown: {
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "border-muted",
      label: "Prices not yet updated",
    },
  }

  const config = statusConfig[statusLevel]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
              config.bgColor,
              config.borderColor,
              config.color,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Compact version for use in headers or tight spaces
 */
export function PriceStatusCompact({ lastRefresh, className }: PriceStatusProps) {
  const statusLevel = useMemo(() => getStatusLevel(lastRefresh), [lastRefresh])
  const timeAgo = useMemo(() => {
    if (!lastRefresh) return "Never"
    return formatDuration(new Date().getTime() - lastRefresh.getTime())
  }, [lastRefresh])

  const colorClasses = {
    fresh: "text-green-600",
    stale: "text-yellow-600",
    warning: "text-red-600",
    unknown: "text-muted-foreground",
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-xs", colorClasses[statusLevel], className)}>
            Updated {timeAgo}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {lastRefresh ? (
            <p>Last refresh: {lastRefresh.toLocaleString()}</p>
          ) : (
            <p>Prices have not been refreshed yet</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
