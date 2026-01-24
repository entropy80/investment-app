'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Menu, FileText, Video, Star, Trees } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/sign-out-button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import React from 'react'

const resourcesLinks = [
  {
    title: "Articles",
    href: "/articles",
    description: "Investment guides and market insights",
    icon: FileText,
  },
  {
    title: "Videos",
    href: "/videos",
    description: "Educational content and tutorials",
    icon: Video,
  },
  {
    title: "Reviews",
    href: "/reviews",
    description: "Broker and platform reviews",
    icon: Star,
  },
]

export function Navbar() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="font-bold text-xl flex items-center gap-2">
          <Trees className="h-6 w-6" />
          Investment App
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center">
          <NavigationMenu>
            <NavigationMenuList>
              {/* Portfolio / Demo Link */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href={isAuthenticated ? "/dashboard/portfolio" : "/demo"} className={navigationMenuTriggerStyle()}>
                    {isAuthenticated ? "Portfolio" : "Try Portfolio Demo"}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Features */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/features" className={navigationMenuTriggerStyle()}>
                    Features
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Resources Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[280px] gap-1 p-2">
                    {resourcesLinks.map((item) => (
                      <ListItem
                        key={item.title}
                        title={item.title}
                        href={item.href}
                        icon={item.icon}
                      >
                        {item.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* About */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/about" className={navigationMenuTriggerStyle()}>
                    About
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Admin Link (only for admins) */}
              {isAdmin && (
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/admin" className={cn(navigationMenuTriggerStyle(), "text-amber-600 hover:text-amber-500")}>
                      Admin
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
              <SignOutButton variant="outline" />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          {isLoading ? (
            <div className="h-9 w-9 bg-muted animate-pulse rounded-md" />
          ) : (
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
                    <Link href={isAuthenticated ? "/dashboard" : "/"} className="font-bold text-xl flex items-center gap-2">
                      <Trees className="h-6 w-6" />
                      Investment App
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  {/* User Info (if authenticated) */}
                  {isAuthenticated && (
                    <div className="pb-4 border-b">
                      <p className="font-medium">{session?.user?.name}</p>
                      <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="flex flex-col gap-3">
                    {/* Portfolio / Demo */}
                    <Link
                      href={isAuthenticated ? "/dashboard/portfolio" : "/demo"}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {isAuthenticated ? "Portfolio" : "Try Portfolio Demo"}
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

                  {/* Auth Actions */}
                  <div className="pt-4 border-t mt-4">
                    {isAuthenticated ? (
                      <SignOutButton variant="outline" />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" asChild className="w-full">
                          <Link href="/auth/signin">Sign In</Link>
                        </Button>
                        <Button asChild className="w-full">
                          <Link href="/auth/signup">Get Started</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { icon?: React.ElementType }
>(({ className, title, children, icon: Icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"
