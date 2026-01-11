'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './navbar'

/**
 * Conditionally renders the public Navbar based on the current route.
 * The Navbar is hidden on dashboard, admin, and auth pages as they have their own layouts.
 */
export function ConditionalNavbar() {
  const pathname = usePathname()

  // Hide navbar on dashboard, admin, and auth pages (they have their own headers/forms)
  const shouldHideNavbar =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/auth')

  if (shouldHideNavbar) {
    return null
  }

  return <Navbar />
}
