"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { Loader2 } from "lucide-react"

/**
 * Demo Mode Entry Page
 *
 * This page automatically signs in as the demo user and redirects
 * to the demo portfolio. The demo user has read-only access.
 */
export default function DemoPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const startDemo = async () => {
      try {
        const result = await signIn("credentials", {
          email: "demo@localhost",
          password: "demo-readonly-user-2024",
          redirect: false,
        })

        if (result?.error) {
          setError("Demo mode is currently unavailable. Please try again later.")
          return
        }

        // Redirect to demo portfolio
        window.location.href = "/dashboard/portfolio/demo-portfolio"
      } catch (err) {
        setError("Failed to start demo mode. Please try again.")
      }
    }

    startDemo()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <a href="/" className="text-primary hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Starting demo mode...</p>
      </div>
    </div>
  )
}
