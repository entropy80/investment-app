/**
 * Two-Factor Authentication Service
 *
 * Handles 2FA setup, verification, and code generation
 */

import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'

// ============================================
// 2FA LOCKOUT CONFIGURATION
// ============================================
const MAX_2FA_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

interface LockoutEntry {
  failedAttempts: number
  lockedUntil: number | null
}

const lockoutStore = new Map<string, LockoutEntry>()

/**
 * Check if a user is locked out from 2FA attempts
 */
export function is2FALockedOut(userId: string): { locked: boolean; remainingSeconds?: number } {
  const entry = lockoutStore.get(userId)
  if (!entry || !entry.lockedUntil) {
    return { locked: false }
  }

  const now = Date.now()
  if (now >= entry.lockedUntil) {
    // Lockout expired, reset
    lockoutStore.delete(userId)
    return { locked: false }
  }

  const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000)
  return { locked: true, remainingSeconds }
}

/**
 * Record a failed 2FA attempt
 */
export function record2FAFailure(userId: string): { locked: boolean; attemptsRemaining: number } {
  const entry = lockoutStore.get(userId) || { failedAttempts: 0, lockedUntil: null }
  entry.failedAttempts++

  if (entry.failedAttempts >= MAX_2FA_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
    lockoutStore.set(userId, entry)
    return { locked: true, attemptsRemaining: 0 }
  }

  lockoutStore.set(userId, entry)
  return { locked: false, attemptsRemaining: MAX_2FA_ATTEMPTS - entry.failedAttempts }
}

/**
 * Clear failed attempts after successful verification
 */
export function clear2FAFailures(userId: string): void {
  lockoutStore.delete(userId)
}

// Clean up expired lockouts every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of lockoutStore.entries()) {
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      lockoutStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

// ============================================
// TYPES
// ============================================

export interface TwoFactorSetupResult {
  success: boolean
  qrCodeUrl?: string  // Contains QR code with secret embedded visually for manual entry
  error?: any
}

export interface TwoFactorVerifyResult {
  success: boolean
  valid?: boolean
  error?: any
  locked?: boolean
  remainingSeconds?: number
  attemptsRemaining?: number
}

/**
 * Format a base32 secret into groups of 4 characters for readability
 * Example: "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP"
 */
function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret
}

/**
 * Generate a combined QR code image with the secret displayed below
 * This keeps the secret visual-only (not in JSON response) for security
 */
async function generateQRCodeWithSecret(
  otpauthUrl: string,
  secret: string
): Promise<string> {
  // Generate the QR code as SVG string
  const qrSvg = await QRCode.toString(otpauthUrl, {
    type: 'svg',
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  // Extract the SVG content (remove XML declaration if present)
  const svgContent = qrSvg.replace(/<\?xml[^?]*\?>\s*/g, '')

  // Format the secret for display
  const formattedSecret = formatSecretForDisplay(secret)

  // Create a combined SVG with QR code and secret text below
  const combinedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <!-- White background -->
  <rect width="240" height="300" fill="#ffffff"/>

  <!-- QR Code (centered) -->
  <g transform="translate(20, 10)">
    ${svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>

  <!-- Divider line -->
  <line x1="20" y1="225" x2="220" y2="225" stroke="#e5e7eb" stroke-width="1"/>

  <!-- Manual entry label -->
  <text x="120" y="248" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#6b7280">
    Can't scan? Enter this code manually:
  </text>

  <!-- Secret key (formatted) -->
  <text x="120" y="275" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="600" fill="#111827" letter-spacing="1">
    ${formattedSecret}
  </text>
</svg>`

  // Convert SVG to base64 data URL
  const base64Svg = Buffer.from(combinedSvg.trim()).toString('base64')
  return `data:image/svg+xml;base64,${base64Svg}`
}

/**
 * Generate a new 2FA secret and QR code for a user
 * The secret is embedded visually in the QR code image for manual entry
 * but is NOT returned separately in the API response for security
 */
export async function generate2FASecret(
  userId: string,
  userEmail: string
): Promise<TwoFactorSetupResult> {
  try {
    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Investment App (${userEmail})`,
      issuer: 'Investment App',
      length: 32,
    })

    if (!secret.otpauth_url || !secret.base32) {
      return { success: false, error: 'Failed to generate OTP URL' }
    }

    // Generate combined QR code image with secret displayed below
    // This allows manual entry while keeping secret out of JSON response
    const qrCodeUrl = await generateQRCodeWithSecret(secret.otpauth_url, secret.base32)

    // Store the secret in database (temporarily, until verified)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32, // Store as base32
        twoFactorEnabled: false, // Not enabled until verified
      },
    })

    return {
      success: true,
      // Note: secret is NOT returned here - it's only visible in the QR code image
      qrCodeUrl,
    }
  } catch (error) {
    console.error('Failed to generate 2FA secret:', error)
    return { success: false, error }
  }
}

/**
 * Verify a 2FA token
 */
export async function verify2FAToken(
  secret: string,
  token: string
): Promise<boolean> {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock drift
    })

    return verified
  } catch (error) {
    console.error('Failed to verify 2FA token:', error)
    return false
  }
}

/**
 * Enable 2FA for a user (after verification)
 */
export async function enable2FA(
  userId: string,
  token: string
): Promise<TwoFactorVerifyResult> {
  try {
    // Check if user is locked out
    const lockoutStatus = is2FALockedOut(userId)
    if (lockoutStatus.locked) {
      return {
        success: false,
        locked: true,
        remainingSeconds: lockoutStatus.remainingSeconds,
        error: `Too many failed attempts. Try again in ${Math.ceil((lockoutStatus.remainingSeconds || 0) / 60)} minutes.`,
      }
    }

    // Get user's stored secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    })

    if (!user?.twoFactorSecret) {
      return { success: false, error: 'No 2FA secret found. Please setup 2FA first.' }
    }

    // Verify the token
    const isValid = await verify2FAToken(user.twoFactorSecret, token)

    if (!isValid) {
      // Record failed attempt
      const failureResult = record2FAFailure(userId)
      return {
        success: false,
        valid: false,
        locked: failureResult.locked,
        attemptsRemaining: failureResult.attemptsRemaining,
      }
    }

    // Clear failed attempts on success
    clear2FAFailures(userId)

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    })

    return { success: true, valid: true }
  } catch (error) {
    console.error('Failed to enable 2FA:', error)
    return { success: false, error }
  }
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(
  userId: string,
  token: string
): Promise<TwoFactorVerifyResult> {
  try {
    // Check if user is locked out
    const lockoutStatus = is2FALockedOut(userId)
    if (lockoutStatus.locked) {
      return {
        success: false,
        locked: true,
        remainingSeconds: lockoutStatus.remainingSeconds,
        error: `Too many failed attempts. Try again in ${Math.ceil((lockoutStatus.remainingSeconds || 0) / 60)} minutes.`,
      }
    }

    // Get user's stored secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user?.twoFactorEnabled) {
      return { success: false, error: '2FA is not enabled' }
    }

    if (!user.twoFactorSecret) {
      return { success: false, error: 'No 2FA secret found' }
    }

    // Verify the token before disabling
    const isValid = await verify2FAToken(user.twoFactorSecret, token)

    if (!isValid) {
      // Record failed attempt
      const failureResult = record2FAFailure(userId)
      return {
        success: false,
        valid: false,
        locked: failureResult.locked,
        attemptsRemaining: failureResult.attemptsRemaining,
      }
    }

    // Clear failed attempts on success
    clear2FAFailures(userId)

    // Disable 2FA and remove secret
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    })

    return { success: true, valid: true }
  } catch (error) {
    console.error('Failed to disable 2FA:', error)
    return { success: false, error }
  }
}

/**
 * Verify 2FA during login
 */
export async function verify2FALogin(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return false
    }

    return verify2FAToken(user.twoFactorSecret, token)
  } catch (error) {
    console.error('Failed to verify 2FA during login:', error)
    return false
  }
}
