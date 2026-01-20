import { NextRequest, NextResponse } from "next/server"
import { decode, encode } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

/**
 * Demo Callback API Route
 *
 * Verifies the demo login token and creates a NextAuth session.
 * This provides a secure, password-less authentication flow for demo users.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=InvalidToken", request.url)
    )
  }

  try {
    // Decode and verify the token
    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET!,
    })

    if (!decoded || decoded.purpose !== "demo-login") {
      throw new Error("Invalid token purpose")
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && typeof decoded.exp === "number" && decoded.exp < now) {
      throw new Error("Token expired")
    }

    // Find the demo user
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub as string,
        isDemo: true
      }
    })

    if (!user) {
      throw new Error("Demo user not found")
    }

    // Create NextAuth session token with user data
    const sessionToken = await encode({
      token: {
        id: user.id,
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    // Determine the correct cookie name based on environment
    // NextAuth uses different prefixes for secure (HTTPS) vs non-secure contexts
    const isSecure = process.env.NODE_ENV === "production"
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"

    // Set the session cookie
    const cookieStore = await cookies()
    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    })

    // Redirect to demo portfolio
    return NextResponse.redirect(
      new URL("/dashboard/portfolio/demo-portfolio", request.url)
    )
  } catch (error) {
    console.error("Demo callback error:", error)
    return NextResponse.redirect(
      new URL("/auth/signin?error=DemoLoginFailed", request.url)
    )
  }
}
