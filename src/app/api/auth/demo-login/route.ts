import { NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

/**
 * Demo Login API Route
 *
 * Generates a short-lived, signed token for demo user authentication.
 * This eliminates the need to expose demo credentials in client-side code.
 */
export async function POST() {
  try {
    // Find the demo user
    const demoUser = await prisma.user.findFirst({
      where: { isDemo: true }
    })

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not configured" },
        { status: 404 }
      )
    }

    // Create a short-lived token (5 minutes) using NextAuth's JWT encoding
    // Include required JWT fields from next-auth type extension plus demo-specific purpose
    const token = await encode({
      token: {
        sub: demoUser.id,
        id: demoUser.id,
        role: demoUser.role,
        isDemo: demoUser.isDemo,
        purpose: "demo-login",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
      } as Parameters<typeof encode>[0]["token"] & { purpose: string },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Demo login error:", error)
    return NextResponse.json(
      { error: "Failed to initiate demo login" },
      { status: 500 }
    )
  }
}
