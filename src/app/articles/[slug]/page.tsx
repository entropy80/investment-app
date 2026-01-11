import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getArticleBySlug } from "@/lib/content/content-service"
import { canAccessContent, getContentPreview } from "@/lib/content/access"
import { MDXRenderer } from "@/components/content/mdx-renderer"
import { TierGate } from "@/components/content/tier-gate"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, User, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return {
      title: "Article Not Found | Investment App",
    }
  }

  return {
    title: `${article.title} | Investment App`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      images: article.coverImage ? [article.coverImage] : undefined,
      publishedTime: article.publishedAt?.toISOString(),
      authors: article.author.name ? [article.author.name] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  const article = await getArticleBySlug(slug)

  if (!article || !article.published) {
    notFound()
  }

  const { hasAccess, isAuthenticated } = await canAccessContent(
    session?.user?.id || null,
    article.requiredTier,
    session?.user?.isDemo ?? false
  )

  const preview = !hasAccess ? getContentPreview(article.content) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Articles
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">
              {article.category.replace(/_/g, " ")}
            </Badge>
            {article.requiredTier !== "FREE" && (
              <Badge>{article.requiredTier}</Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>

          <p className="text-xl text-slate-300 mb-6">{article.excerpt}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {article.author.name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {article.author.name}
              </span>
            )}
            {article.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(article.publishedAt), "MMMM d, yyyy")}
              </span>
            )}
            {article.readTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {article.readTime} min read
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Cover Image */}
      {article.coverImage && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>
      )}

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {hasAccess ? (
            <MDXRenderer content={article.content} />
          ) : (
            <TierGate
              requiredTier={article.requiredTier}
              isAuthenticated={isAuthenticated}
              preview={preview || undefined}
            >
              <MDXRenderer content={article.content} />
            </TierGate>
          )}
        </div>
      </section>

      {/* Tags */}
      {article.tags.length > 0 && (
        <section className="pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t pt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
