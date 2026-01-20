"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * Demo Mode Entry Page
 *
 * This page initiates a secure, token-based demo login flow.
 * No credentials are exposed in client-side code - authentication
 * is handled via signed, short-lived tokens verified server-side.
 *
 * Flow:
 * 1. Page loads and calls /api/auth/demo-login to get a signed token
 * 2. Redirects to /api/auth/demo-callback with the token
 * 3. Callback verifies token, creates session, redirects to dashboard
 */
export default function DemoPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const startDemo = async () => {
      try {
        // Request a demo login token from the server
        const response = await fetch("/api/auth/demo-login", {
          method: "POST",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to start demo")
        }

        const { token } = await response.json()

        // Redirect to the callback endpoint which will create the session
        window.location.href = `/api/auth/demo-callback?token=${encodeURIComponent(token)}`
      } catch (err) {
        setError("Demo mode is currently unavailable. Please try again later.")
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
