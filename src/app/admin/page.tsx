import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type User = Prisma.UserGetPayload<{}>
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  BookOpen,
  Video,
  Star,
  UserPlus,
  FileText
} from "lucide-react"
import { format, subDays } from "date-fns"

async function getAdminStats() {
  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const sevenDaysAgo = subDays(now, 7)

  // User statistics
  const totalUsers = await prisma.user.count()
  const newUsersThisMonth = await prisma.user.count({
    where: { createdAt: { gte: thirtyDaysAgo } }
  })
  const newUsersThisWeek = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  })

  // Content statistics
  const articlesCount = await prisma.article.count()
  const publishedArticles = await prisma.article.count({ where: { published: true } })
  const videosCount = await prisma.video.count()
  const publishedVideos = await prisma.video.count({ where: { published: true } })
  const reviewsCount = await prisma.brokerReview.count()
  const publishedReviews = await prisma.brokerReview.count({ where: { published: true } })

  // Portfolio statistics
  const portfoliosCount = await prisma.portfolio.count()
  const accountsCount = await prisma.financialAccount.count()

  // Recent users
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  })

  return {
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth,
      newThisWeek: newUsersThisWeek
    },
    content: {
      articles: { total: articlesCount, published: publishedArticles },
      videos: { total: videosCount, published: publishedVideos },
      reviews: { total: reviewsCount, published: publishedReviews },
    },
    portfolios: {
      total: portfoliosCount,
      accounts: accountsCount,
    },
    recentUsers,
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  const stats = await getAdminStats()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of your platform metrics and activity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-gray-500 mt-1">
              +{stats.users.newThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Articles
            </CardTitle>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.articles.published}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.content.articles.total} total ({stats.content.articles.total - stats.content.articles.published} drafts)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Videos
            </CardTitle>
            <Video className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.videos.published}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.content.videos.total} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Broker Reviews
            </CardTitle>
            <Star className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.reviews.published}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.content.reviews.total} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recent Users
            </CardTitle>
            <CardDescription>Latest user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentUsers.map((user: User) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.name || "No name"}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentUsers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Platform Statistics
            </CardTitle>
            <CardDescription>User engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">User Growth</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">New this month</span>
                    <Badge variant="outline">{stats.users.newThisMonth}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">New this week</span>
                    <Badge variant="outline">{stats.users.newThisWeek}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Portfolio Tracking</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Portfolios</span>
                    <Badge variant="outline">{stats.portfolios.total}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Financial Accounts</span>
                    <Badge variant="outline">{stats.portfolios.accounts}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
