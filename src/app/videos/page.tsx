import { Metadata } from "next"
import { getVideos } from "@/lib/content/content-service"
import { ContentCard } from "@/components/content/content-card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Video Tutorials | Investment App",
  description:
    "Educational video tutorials on investing, portfolio management, and using brokerage platforms.",
}

const VIDEO_CATEGORIES = [
  "Getting Started",
  "Investing Basics",
  "Portfolio Management",
  "Market Analysis",
  "Broker Tutorials",
  "Advanced Strategies",
]

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const selectedCategory = params.category

  const { videos, total } = await getVideos({
    published: true,
    category: selectedCategory,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Video Tutorials</h1>
          <p className="text-xl text-slate-300 max-w-2xl">
            Learn investing concepts and platform tutorials through our
            comprehensive video library.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <Link href="/videos">
              <Badge
                variant={!selectedCategory ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
              >
                All Videos
              </Badge>
            </Link>
            {VIDEO_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/videos?category=${encodeURIComponent(category)}`}
              >
                <Badge
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  {category}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Videos Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {videos.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-8">
                {selectedCategory
                  ? `Showing ${total} videos in ${selectedCategory}`
                  : `${total} videos`}
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <ContentCard
                    key={video.id}
                    title={video.title}
                    slug={video.slug}
                    excerpt={video.description}
                    coverImage={video.thumbnail}
                    category={video.category}
                    requiredTier={video.requiredTier}
                    publishedAt={video.publishedAt}
                    author={video.author}
                    type="video"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No videos found
                {selectedCategory && ` in ${selectedCategory}`}.
              </p>
              {selectedCategory && (
                <Link
                  href="/videos"
                  className="text-primary hover:underline mt-2 inline-block"
                >
                  View all videos
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
