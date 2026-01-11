import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendWelcomeEmail } from "@/lib/email/email-service"
import { notifyWelcome } from "@/lib/notifications/notification-service"
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit/rate-limiter"

export async function POST(req: Request) {
  try {
    // Rate limit: 3 registrations per hour per IP
    const rateLimited = await withRateLimit('register', RateLimitPresets.AUTH_REGISTER)
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { name, email, password } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Validate password complexity
    const passwordErrors: string[] = []
    if (password.length < 8) {
      passwordErrors.push("at least 8 characters")
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push("one uppercase letter")
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push("one lowercase letter")
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push("one number")
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      passwordErrors.push("one special character")
    }

    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { error: `Password must contain: ${passwordErrors.join(", ")}` },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "USER",
      }
    })

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name || "User").catch((error) => {
      console.error('Failed to send welcome email:', error)
      // Don't fail registration if email fails
    })

    // Create welcome notification (non-blocking)
    notifyWelcome(user.id).catch((error) => {
      console.error('Failed to create welcome notification:', error)
    })

    // Return user without password
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
