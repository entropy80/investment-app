import { Metadata } from "next"
import { getBrokerReviews } from "@/lib/content/content-service"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Lock } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { getTierBadgeVariant, getTierDisplayName } from "@/lib/content/access"

export const metadata: Metadata = {
  title: "Broker Reviews | Investment App",
  description:
    "In-depth broker reviews and comparisons to help you choose the right platform for your investing needs.",
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5

  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < fullStars
              ? "fill-yellow-400 text-yellow-400"
              : i === fullStars && hasHalf
              ? "fill-yellow-400/50 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
      <span className="ml-1 font-medium">{rating.toFixed(1)}</span>
    </div>
  )
}

export default async function ReviewsPage() {
  const { reviews, total } = await getBrokerReviews({
    published: true,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Broker Reviews</h1>
          <p className="text-xl text-slate-300 max-w-2xl">
            Comprehensive reviews and comparisons of leading brokerage platforms
            to help you make informed decisions.
          </p>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {reviews.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-8">
                {total} broker reviews
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <Link key={review.id} href={`/reviews/${review.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          {review.logo ? (
                            <img
                              src={review.logo}
                              alt={review.brokerName}
                              className="h-12 w-12 object-contain"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                              <span className="text-xl font-bold text-muted-foreground">
                                {review.brokerName[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {review.brokerName}
                            </h3>
                            <RatingStars rating={review.overallRating} />
                          </div>
                        </div>
                        {review.requiredTier !== "FREE" && (
                          <Badge
                            variant={getTierBadgeVariant(review.requiredTier)}
                            className="gap-1 w-fit"
                          >
                            <Lock className="h-3 w-3" />
                            {getTierDisplayName(review.requiredTier)}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {review.summary}
                        </p>

                        {/* Rating breakdown */}
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-medium">
                              {review.feesRating.toFixed(1)}
                            </div>
                            <div className="text-muted-foreground">Fees</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">
                              {review.platformRating.toFixed(1)}
                            </div>
                            <div className="text-muted-foreground">Platform</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">
                              {review.supportRating.toFixed(1)}
                            </div>
                            <div className="text-muted-foreground">Support</div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground">
                        {review.publishedAt &&
                          format(new Date(review.publishedAt), "MMM d, yyyy")}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No broker reviews available yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
