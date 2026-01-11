'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './footer'

/**
 * Conditionally renders the Footer based on the current route.
 * The Footer is hidden on dashboard and admin pages as they have their own layouts.
 */
export function ConditionalFooter() {
  const pathname = usePathname()

  // Hide footer on dashboard and admin pages (they have their own footers)
  // Also hide on auth pages for cleaner login/signup experience
  const shouldHideFooter =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/auth')

  if (shouldHideFooter) {
    return null
  }

  return <Footer />
}
