import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getVideoBySlug } from "@/lib/content/content-service"
import { canAccessContent, getContentPreview } from "@/lib/content/access"
import { VideoEmbed } from "@/components/content/video-embed"
import { TierGate } from "@/components/content/tier-gate"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowLeft, Clock } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

type Props = {
  params: Promise<{ slug: string }>
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const video = await getVideoBySlug(slug)

  if (!video) {
    return {
      title: "Video Not Found | Investment App",
    }
  }

  return {
    title: `${video.title} | Investment App`,
    description: video.description,
    openGraph: {
      title: video.title,
      description: video.description,
      type: "video.other",
      images: video.thumbnail ? [video.thumbnail] : undefined,
    },
  }
}

export default async function VideoPage({ params }: Props) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  const video = await getVideoBySlug(slug)

  if (!video || !video.published) {
    notFound()
  }

  const { hasAccess, isAuthenticated } = await canAccessContent(
    session?.user?.id || null,
    video.requiredTier,
    session?.user?.isDemo ?? false
  )

  const preview = !hasAccess ? getContentPreview(video.description) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-slate-900 text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Videos
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">{video.category}</Badge>
            <Badge variant="outline">{video.platform}</Badge>
            {video.requiredTier !== "FREE" && (
              <Badge>{video.requiredTier}</Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">{video.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {video.author.name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {video.author.name}
              </span>
            )}
            {video.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(video.publishedAt), "MMMM d, yyyy")}
              </span>
            )}
            {video.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(video.duration)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Video Player */}
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {hasAccess ? (
            <VideoEmbed
              embedUrl={video.embedUrl}
              platform={video.platform}
              title={video.title}
            />
          ) : (
            <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-900">
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <TierGate
                  requiredTier={video.requiredTier}
                  isAuthenticated={isAuthenticated}
                >
                  <VideoEmbed
                    embedUrl={video.embedUrl}
                    platform={video.platform}
                    title={video.title}
                  />
                </TierGate>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Description */}
      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">About this video</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {hasAccess ? video.description : preview}
              {!hasAccess && "..."}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
