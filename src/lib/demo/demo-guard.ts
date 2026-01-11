import { NextResponse } from "next/server"
import { Session } from "next-auth"

/**
 * Demo user email constant
 */
export const DEMO_USER_EMAIL = "demo@localhost"

/**
 * Demo portfolio ID (set after seeding)
 * This is used for redirecting to the demo portfolio
 */
export const DEMO_PORTFOLIO_ID = "demo-portfolio"

/**
 * Check if the session belongs to a demo user
 */
export function isDemoUser(session: Session | null): boolean {
  return session?.user?.isDemo === true
}

/**
 * Returns a 403 response if the user is a demo user
 * Use this at the start of write operations (POST, PUT, PATCH, DELETE)
 */
export function demoGuard(session: Session | null): NextResponse | null {
  if (isDemoUser(session)) {
    return NextResponse.json(
      {
        error: "Demo mode: This action is read-only. Sign up to create your own portfolio!",
        isDemo: true
      },
      { status: 403 }
    )
  }
  return null
}

/**
 * Demo mode message for UI display
 */
export const DEMO_MODE_MESSAGE = {
  title: "You're viewing a demo",
  description: "This is a read-only preview. Sign up to create and manage your own portfolios.",
  cta: "Sign Up Free",
  ctaLink: "/auth/signup"
}
