'use client'

import Link from 'next/link'
import { Menu, FileText, Video, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/sign-out-button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface MobileNavProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

const resourcesLinks = [
  { title: "Articles", href: "/articles", icon: FileText },
  { title: "Videos", href: "/videos", icon: Video },
  { title: "Reviews", href: "/reviews", icon: Star },
]

export function MobileNav({ user }: MobileNavProps) {
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"

  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>
              <Link href="/dashboard" className="font-bold text-xl">
                Investment App
              </Link>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-8">
            {/* User Info */}
            <div className="pb-4 border-b">
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-3">
              {/* Portfolio */}
              <Link href="/dashboard/portfolio" className="text-sm font-medium hover:text-primary transition-colors">
                Portfolio
              </Link>

              {/* Budget */}
              <Link href="/dashboard/budget" className="text-sm font-medium hover:text-primary transition-colors">
                Budget
              </Link>

              {/* Features */}
              <Link href="/features" className="text-sm font-medium hover:text-primary transition-colors">
                Features
              </Link>

              {/* Resources Section */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Resources
                </p>
                <div className="flex flex-col gap-2 pl-2 border-l-2 border-muted">
                  {resourcesLinks.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* About */}
              <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
                About
              </Link>

              {/* Admin */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Sign Out */}
            <div className="pt-4 border-t mt-4">
              <SignOutButton variant="outline" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
