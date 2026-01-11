"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "ghost" | "secondary" | "default" }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      await signOut({
        callbackUrl: "/",
        redirect: true
      })
    } catch (error) {
      console.error("Sign out error:", error)
      // Even if there's an error, try to redirect manually
      window.location.href = "/"
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleSignOut}
      disabled={isLoading}
      className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600 hover:text-white hover:border-slate-500"
    >
      {isLoading ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
