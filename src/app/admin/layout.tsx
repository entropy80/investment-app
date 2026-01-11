import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { Footer } from "@/components/navigation/footer"
import {
  LayoutDashboard,
  Users,
  Settings,
  ArrowLeft,
  Shield,
  FileText,
  Video,
  Star
} from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Double-check admin access (middleware should handle this, but defense in depth)
  const userRole = session.user.role
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to App</span>
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-lg">Admin Panel</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">
                {session.user.email}
              </span>
              <span className="px-2 py-1 text-xs bg-amber-500 text-slate-900 rounded font-medium">
                {userRole}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white shadow-sm border-r">
          <nav className="p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>Users</span>
            </Link>
            <div className="pt-4 mt-4 border-t">
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Content
              </p>
              <Link
                href="/admin/content/articles"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span>Articles</span>
              </Link>
              <Link
                href="/admin/content/videos"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Video className="h-5 w-5" />
                <span>Videos</span>
              </Link>
              <Link
                href="/admin/content/reviews"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Star className="h-5 w-5" />
                <span>Broker Reviews</span>
              </Link>
            </div>
            <div className="pt-4 mt-4 border-t">
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}
