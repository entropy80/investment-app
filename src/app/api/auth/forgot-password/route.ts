import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email/email-service";
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit/rate-limiter";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const rateLimited = await withRateLimit('forgot-password', RateLimitPresets.AUTH_PASSWORD_RESET)
    if (rateLimited) return rateLimited

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // Create the reset token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Send the password reset email
    await sendPasswordResetEmail(user.email, user.name || "User", token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
