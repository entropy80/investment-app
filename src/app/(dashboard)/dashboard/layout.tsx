import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trees } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { MobileNav } from "@/components/navigation/mobile-nav"
import { DashboardNavbar } from "@/components/navigation/dashboard-navbar"
import { Footer } from "@/components/navigation/footer"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const isAdmin = session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN"

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="font-bold text-xl flex items-center gap-2">
              <Trees className="h-5 w-5" />
              Investment App
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center">
              <DashboardNavbar isAdmin={isAdmin} />
            </nav>

            {/* Desktop User Info & Sign Out */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex flex-col items-end">
                <p className="text-sm font-medium">{session.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
              <SignOutButton />
            </div>

            {/* Mobile Navigation */}
            <MobileNav user={session.user} />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
