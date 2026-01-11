import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PieChart, BookOpen, Video, Star } from "lucide-react"

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  // Fetch user's portfolio count
  const portfolioCount = await prisma.portfolio.count({
    where: { userId: session.user.id },
  })

  // Fetch recent content counts
  const [articlesCount, videosCount, reviewsCount] = await Promise.all([
    prisma.article.count({ where: { published: true } }),
    prisma.video.count({ where: { published: true } }),
    prisma.brokerReview.count({ where: { published: true } }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name}!</h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s an overview of your account and available resources
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Portfolio Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioCount}</div>
            <p className="text-xs text-muted-foreground">
              {portfolioCount === 0 ? "Create your first portfolio" : "portfolios tracked"}
            </p>
          </CardContent>
        </Card>

        {/* Articles Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articlesCount}</div>
            <p className="text-xs text-muted-foreground">
              educational guides available
            </p>
          </CardContent>
        </Card>

        {/* Videos Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videosCount}</div>
            <p className="text-xs text-muted-foreground">
              video tutorials available
            </p>
          </CardContent>
        </Card>

        {/* Reviews Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broker Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewsCount}</div>
            <p className="text-xs text-muted-foreground">
              broker comparisons available
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{session?.user?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {session?.user?.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Account Type</span>
                <Badge variant="default">Member</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium capitalize">{session?.user?.role.toLowerCase()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Explore features and manage your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/dashboard/portfolio">
                  <PieChart className="h-4 w-4 mr-2" />
                  Portfolio
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/articles">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Articles
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/videos">
                  <Video className="h-4 w-4 mr-2" />
                  Videos
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/reviews">
                  <Star className="h-4 w-4 mr-2" />
                  Reviews
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Card */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Complete these steps to get the most out of the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Badge variant="default" className="mt-0.5">✓</Badge>
              <span className="text-sm">Create your account</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant={portfolioCount > 0 ? "default" : "secondary"} className="mt-0.5">
                {portfolioCount > 0 ? "✓" : "2"}
              </Badge>
              <div>
                <p className="text-sm">Set up your first portfolio</p>
                {portfolioCount === 0 && (
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                    <Link href="/dashboard/portfolio">Create portfolio →</Link>
                  </Button>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">3</Badge>
              <div>
                <p className="text-sm">Add your investment accounts and holdings</p>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/dashboard/portfolio">Manage holdings →</Link>
                </Button>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">4</Badge>
              <div>
                <p className="text-sm">Explore educational content and broker reviews</p>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/articles">Browse articles →</Link>
                </Button>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
