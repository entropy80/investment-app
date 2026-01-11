'use client'

import Link from 'next/link'
import { FileText, Video, Star } from 'lucide-react'
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

interface DashboardNavbarProps {
  isAdmin: boolean
}

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

export function DashboardNavbar({ isAdmin }: DashboardNavbarProps) {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {/* Portfolio */}
        <NavigationMenuItem>
          <Link href="/dashboard/portfolio" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Portfolio
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        {/* Budget */}
        <NavigationMenuItem>
          <Link href="/dashboard/budget" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Budget
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        {/* Features */}
        <NavigationMenuItem>
          <Link href="/features" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Features
            </NavigationMenuLink>
          </Link>
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
          <Link href="/about" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              About
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        {/* Admin Link (only for admins) */}
        {isAdmin && (
          <NavigationMenuItem>
            <Link href="/admin" legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "text-amber-600 hover:text-amber-500")}>
                Admin
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  )
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
