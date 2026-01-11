"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEMO_MODE_MESSAGE } from "@/lib/demo/demo-guard"

interface DemoBannerProps {
  className?: string
}

export function DemoBanner({ className = "" }: DemoBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Eye className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800">
              {DEMO_MODE_MESSAGE.title}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {DEMO_MODE_MESSAGE.description}
            </p>
            <div className="mt-3">
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Link href={DEMO_MODE_MESSAGE.ctaLink}>
                  {DEMO_MODE_MESSAGE.cta}
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Compact demo indicator for tight spaces (e.g., in headers)
 */
export function DemoIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
      <Eye className="h-3 w-3" />
      Demo Mode
    </span>
  )
}
