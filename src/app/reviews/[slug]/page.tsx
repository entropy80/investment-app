import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBrokerReviewBySlug } from "@/lib/content/content-service"
import { canAccessContent, getContentPreview } from "@/lib/content/access"
import { MDXRenderer } from "@/components/content/mdx-renderer"
import { TierGate } from "@/components/content/tier-gate"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  User,
  ArrowLeft,
  Star,
  Check,
  X,
  ExternalLink,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

type Props = {
  params: Promise<{ slug: string }>
}

function RatingBar({ label, rating }: { label: string; rating: number }) {
  const percentage = (rating / 5) * 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{rating.toFixed(1)}/5</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function OverallRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5

  return (
    <div className="text-center">
      <div className="text-5xl font-bold mb-2">{rating.toFixed(1)}</div>
      <div className="flex justify-center gap-1 mb-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-6 w-6 ${
              i < fullStars
                ? "fill-yellow-400 text-yellow-400"
                : i === fullStars && hasHalf
                ? "fill-yellow-400/50 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <div className="text-sm text-muted-foreground">Overall Rating</div>
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const review = await getBrokerReviewBySlug(slug)

  if (!review) {
    return {
      title: "Review Not Found | Investment App",
    }
  }

  return {
    title: `${review.brokerName} Review | Investment App`,
    description: review.summary,
    openGraph: {
      title: `${review.brokerName} Review`,
      description: review.summary,
      type: "article",
      images: review.logo ? [review.logo] : undefined,
    },
  }
}

export default async function ReviewPage({ params }: Props) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  const review = await getBrokerReviewBySlug(slug)

  if (!review || !review.published) {
    notFound()
  }

  const { hasAccess, isAuthenticated } = await canAccessContent(
    session?.user?.id || null,
    review.requiredTier,
    session?.user?.isDemo ?? false
  )

  const preview = !hasAccess ? getContentPreview(review.content) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reviews
          </Link>

          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {review.logo && (
              <img
                src={review.logo}
                alt={review.brokerName}
                className="h-20 w-20 object-contain bg-white rounded-lg p-2"
              />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                {review.requiredTier !== "FREE" && (
                  <Badge>{review.requiredTier}</Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {review.brokerName} Review
              </h1>
              <p className="text-slate-300">{review.summary}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mt-6">
            {review.author.name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {review.author.name}
              </span>
            )}
            {review.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(review.publishedAt), "MMMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {hasAccess ? (
                <MDXRenderer content={review.content} />
              ) : (
                <TierGate
                  requiredTier={review.requiredTier}
                  isAuthenticated={isAuthenticated}
                  preview={preview || undefined}
                >
                  <MDXRenderer content={review.content} />
                </TierGate>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Overall Rating Card */}
              <Card>
                <CardContent className="pt-6">
                  <OverallRating rating={review.overallRating} />
                </CardContent>
              </Card>

              {/* Detailed Ratings Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Rating Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RatingBar label="Fees" rating={review.feesRating} />
                  <RatingBar label="Platform" rating={review.platformRating} />
                  <RatingBar label="Support" rating={review.supportRating} />
                </CardContent>
              </Card>

              {/* Pros & Cons Card */}
              {(review.pros.length > 0 || review.cons.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pros & Cons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {review.pros.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">Pros</h4>
                        <ul className="space-y-2">
                          {review.pros.map((pro, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">Cons</h4>
                        <ul className="space-y-2">
                          {review.cons.map((con, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Affiliate CTA */}
              {review.affiliateLink && hasAccess && (
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="pt-6 text-center">
                    <p className="mb-4">
                      Ready to get started with {review.brokerName}?
                    </p>
                    <Button variant="secondary" asChild>
                      <a
                        href={review.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Account
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
