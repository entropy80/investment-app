import { SubscriptionTier } from '@prisma/client'

/**
 * Content Access Control - Authentication-Only Model
 *
 * Access levels:
 * - FREE: Accessible to everyone (no login required)
 * - AUTHENTICATED: Requires user login
 */

export type ContentAccessResult = {
  hasAccess: boolean
  isAuthenticated: boolean
  requiredTier: SubscriptionTier
}

/**
 * Check if a user has access to content based on authentication status
 *
 * @param userId - The user's ID (null for unauthenticated users)
 * @param requiredTier - The tier required to access the content
 * @param isDemo - Whether this is a demo user (demo users treated as unauthenticated)
 * @returns Object with hasAccess boolean and authentication status
 */
export async function canAccessContent(
  userId: string | null,
  requiredTier: SubscriptionTier,
  isDemo: boolean = false
): Promise<ContentAccessResult> {
  // Demo users are treated as unauthenticated for content access
  const isAuthenticated = !!userId && !isDemo

  // FREE content is accessible to everyone
  if (requiredTier === 'FREE') {
    return { hasAccess: true, isAuthenticated, requiredTier }
  }

  // AUTHENTICATED content requires login (demo users don't qualify)
  return { hasAccess: isAuthenticated, isAuthenticated, requiredTier }
}

/**
 * Get a preview of gated content
 * Returns the first N characters of the content
 *
 * @param content - The full content string
 * @param previewLength - Number of characters to include (default: 500)
 * @returns Truncated content with ellipsis
 */
export function getContentPreview(content: string, previewLength = 500): string {
  if (content.length <= previewLength) {
    return content
  }

  // Find a good breaking point (end of word or sentence)
  let breakPoint = content.lastIndexOf(' ', previewLength)
  if (breakPoint === -1) breakPoint = previewLength

  return content.slice(0, breakPoint).trim() + '...'
}

/**
 * Get the tier badge variant for display
 */
export function getTierBadgeVariant(tier: SubscriptionTier): 'default' | 'secondary' | 'outline' {
  switch (tier) {
    case 'AUTHENTICATED':
      return 'default'
    default:
      return 'outline'
  }
}

/**
 * Get human-readable tier name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    FREE: 'Free',
    AUTHENTICATED: 'Members Only',
  }
  return names[tier]
}

/**
 * Check if content should show a login prompt
 */
export function shouldShowLoginPrompt(
  hasAccess: boolean,
  requiredTier: SubscriptionTier
): boolean {
  if (hasAccess) return false
  if (requiredTier === 'FREE') return false
  return true
}
