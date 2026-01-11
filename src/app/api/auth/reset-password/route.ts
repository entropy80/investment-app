import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit/rate-limiter";
import bcrypt from "bcryptjs";

/**
 * Validate password complexity
 * Must match the requirements in /api/register
 */
function validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("at least 8 characters")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("one uppercase letter")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("one lowercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("one number")
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("one special character")
  }

  return { valid: errors.length === 0, errors }
}

// GET - Validate token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json({ valid: false }, { status: 410 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

// POST - Reset password
export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const rateLimited = await withRateLimit('reset-password', RateLimitPresets.AUTH_PASSWORD_RESET)
    if (rateLimited) return rateLimited

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password complexity (same rules as registration)
    const passwordValidation = validatePasswordComplexity(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: `Password must contain: ${passwordValidation.errors.join(", ")}` },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json(
        { error: "Reset link has expired" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and delete the reset token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
