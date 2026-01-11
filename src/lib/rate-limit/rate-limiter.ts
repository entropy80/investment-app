/**
 * Rate Limiting Service
 *
 * Simple in-memory rate limiter for API endpoints
 * For production, consider using Redis or a dedicated rate limiting service
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  maxRequests: number // Maximum number of requests
  windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 } // Default: 100 requests per minute
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    })

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Strict limits for sensitive endpoints
  STRICT: { maxRequests: 5, windowMs: 60000 }, // 5 per minute

  // Standard limits for API endpoints
  STANDARD: { maxRequests: 100, windowMs: 60000 }, // 100 per minute

  // Generous limits for regular requests
  GENEROUS: { maxRequests: 300, windowMs: 60000 }, // 300 per minute

  // Auth-specific limits
  AUTH_LOGIN: { maxRequests: 5, windowMs: 15 * 60000 }, // 5 per 15 minutes
  AUTH_REGISTER: { maxRequests: 3, windowMs: 60 * 60000 }, // 3 per hour
  AUTH_2FA: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  AUTH_PASSWORD_RESET: { maxRequests: 5, windowMs: 15 * 60000 }, // 5 per 15 minutes

  // Payment limits
  PAYMENT: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
}

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  // Check common proxy headers
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  // Fallback to a default identifier
  return 'unknown'
}

/**
 * Apply rate limiting to an API route
 * Returns a NextResponse if rate limited, null otherwise
 *
 * @param endpoint - The endpoint identifier (e.g., 'register', '2fa-enable')
 * @param config - Rate limit configuration
 * @param userId - Optional user ID to include in the identifier
 */
export async function withRateLimit(
  endpoint: string,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const ip = await getClientIp()
  const identifier = userId ? `${endpoint}:${userId}:${ip}` : `${endpoint}:${ip}`

  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        },
      }
    )
  }

  return null
}
