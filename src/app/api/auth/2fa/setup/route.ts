/**
 * 2FA Setup API - Generate QR code for 2FA setup
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generate2FASecret } from '@/lib/auth/twofa-service'
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit/rate-limiter'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 requests per minute per user
    const rateLimited = await withRateLimit('2fa-setup', RateLimitPresets.AUTH_2FA, session.user.id)
    if (rateLimited) return rateLimited

    const result = await generate2FASecret(session.user.id, session.user.email)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to generate 2FA secret' },
        { status: 500 }
      )
    }

    // qrCodeUrl contains the QR code image with the secret displayed below for manual entry
    // The secret is NOT returned in the JSON response - only visible in the image
    return NextResponse.json({
      success: true,
      qrCodeUrl: result.qrCodeUrl,
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
