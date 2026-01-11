/**
 * 2FA Disable API - Disable 2FA after verification
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { disable2FA } from '@/lib/auth/twofa-service'
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit/rate-limiter'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 requests per minute per user (brute force protection for TOTP)
    const rateLimited = await withRateLimit('2fa-disable', RateLimitPresets.AUTH_2FA, session.user.id)
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    const result = await disable2FA(session.user.id, token)

    if (!result.success) {
      // Account locked due to too many failed attempts
      if (result.locked) {
        return NextResponse.json(
          {
            error: result.error || 'Account temporarily locked',
            locked: true,
            remainingSeconds: result.remainingSeconds,
          },
          { status: 423 } // 423 Locked
        )
      }
      // Invalid code but not locked yet
      if (result.valid === false) {
        return NextResponse.json(
          {
            error: 'Invalid verification code',
            attemptsRemaining: result.attemptsRemaining,
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: result.error || 'Failed to disable 2FA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
