import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, Server, Shield } from "lucide-react"

async function getSystemStats() {
  const userCount = await prisma.user.count()
  const articleCount = await prisma.article.count()
  const videoCount = await prisma.video.count()
  const reviewCount = await prisma.brokerReview.count()
  const portfolioCount = await prisma.portfolio.count()
  const sessionCount = await prisma.session.count()

  return {
    userCount,
    articleCount,
    videoCount,
    reviewCount,
    portfolioCount,
    sessionCount,
  }
}

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  const stats = await getSystemStats()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 mt-1">
          System configuration and information
        </p>
      </div>

      {/* Admin Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Admin Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{session?.user?.name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <Badge variant="default">{session?.user?.role}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-mono text-sm">{session?.user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>Current record counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-2xl font-bold">{stats.userCount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Articles</p>
              <p className="text-2xl font-bold">{stats.articleCount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Videos</p>
              <p className="text-2xl font-bold">{stats.videoCount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Reviews</p>
              <p className="text-2xl font-bold">{stats.reviewCount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Portfolios</p>
              <p className="text-2xl font-bold">{stats.portfolioCount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Active Sessions</p>
              <p className="text-2xl font-bold">{stats.sessionCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Framework</p>
                <p className="font-medium">Next.js 16</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Database</p>
                <p className="font-medium">PostgreSQL 17</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ORM</p>
                <p className="font-medium">Prisma 6.x</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Authentication</p>
                <p className="font-medium">NextAuth v4</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Access Model</p>
                <p className="font-medium">Authentication-Only</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Environment</p>
                <Badge variant="outline">
                  {process.env.NODE_ENV || "development"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags / Settings (placeholder for future) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Configuration
          </CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Feature flags and system configuration options will be available here in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
