import { SubscriptionTier } from '@prisma/client'

// ============================================================================
// Portfolio Feature Access Control - Authentication-Only Model
// ============================================================================

/**
 * In the auth-only model, all authenticated users have access to all features.
 */

/**
 * Check if user can create more portfolios - always allowed for authenticated users
 */
export async function canCreatePortfolio(_userId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
  tier: SubscriptionTier
}> {
  return {
    allowed: true,
    current: 0,
    limit: -1,
    tier: 'AUTHENTICATED',
  }
}

/**
 * Check if user can create more accounts in a portfolio - always allowed
 */
export async function canCreateAccount(
  _userId: string,
  _portfolioId: string
): Promise<{
  allowed: boolean
  current: number
  limit: number
  tier: SubscriptionTier
}> {
  return {
    allowed: true,
    current: 0,
    limit: -1,
    tier: 'AUTHENTICATED',
  }
}

/**
 * Validate user access for API routes - always allowed for authenticated users
 */
export async function validatePortfolioAccess(
  _userId: string,
  _feature: string
): Promise<{ allowed: boolean; tier: SubscriptionTier; requiredTier: SubscriptionTier }> {
  return { allowed: true, tier: 'AUTHENTICATED', requiredTier: 'FREE' }
}
