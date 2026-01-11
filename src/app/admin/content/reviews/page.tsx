import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBrokerReviews } from "@/lib/content/content-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Star, Plus, Search, Eye, Pencil } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-medium">{rating.toFixed(1)}</span>
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    </div>
  )
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams

  const { reviews, total } = await getBrokerReviews()

  // Filter by search if provided
  const filteredReviews = params.search
    ? reviews.filter(
        (r) =>
          r.brokerName.toLowerCase().includes(params.search!.toLowerCase()) ||
          r.summary.toLowerCase().includes(params.search!.toLowerCase())
      )
    : reviews

  // Statistics
  const publishedCount = reviews.filter((r) => r.published).length
  const draftCount = reviews.filter((r) => !r.published).length
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broker Reviews</h1>
          <p className="text-gray-500 mt-1">
            Create and manage broker comparison reviews
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/reviews/new">
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex gap-4">
            <input
              type="text"
              name="search"
              placeholder="Search by broker name or summary..."
              defaultValue={params.search || ""}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit">Search</Button>
            {params.search && (
              <Button variant="outline" asChild>
                <a href="/admin/content/reviews">Clear</a>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            All Reviews
          </CardTitle>
          <CardDescription>
            {params.search
              ? `Showing ${filteredReviews.length} results for "${params.search}"`
              : `${total} total reviews`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broker</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {review.logo && (
                        <img
                          src={review.logo}
                          alt={review.brokerName}
                          className="h-8 w-8 rounded object-contain"
                        />
                      )}
                      <div>
                        <p className="font-medium">{review.brokerName}</p>
                        <p className="text-sm text-gray-500">/{review.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RatingStars rating={review.overallRating} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        review.requiredTier === "FREE"
                          ? "outline"
                          : "default"
                      }
                    >
                      {review.requiredTier === "FREE" ? "Free" : "Members Only"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={review.published ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {review.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {review.author.name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/reviews/${review.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/content/reviews/${review.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No reviews found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
