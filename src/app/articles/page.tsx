import { Metadata } from "next"
import { getPublishedArticles } from "@/lib/content/content-service"
import { ContentCard } from "@/components/content/content-card"
import { Badge } from "@/components/ui/badge"
import { ArticleCategory } from "@prisma/client"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Articles | Investment App",
  description:
    "Educational articles and guides on investing, portfolio management, and broker comparisons.",
}

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  BROKER_REVIEW: "Broker Reviews",
  INVESTING_GUIDE: "Investing Guides",
  BASICS: "Basics",
  MARKET_ANALYSIS: "Market Analysis",
  PORTFOLIO_STRATEGY: "Portfolio Strategy",
  NEWS: "News",
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const selectedCategory = params.category as ArticleCategory | undefined

  const { articles, total } = await getPublishedArticles({
    category: selectedCategory,
  })

  // Get all unique categories from articles
  const categories = Object.keys(CATEGORY_LABELS) as ArticleCategory[]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Articles & Guides</h1>
          <p className="text-xl text-slate-300 max-w-2xl">
            Expert insights on investing, portfolio management, and making
            informed decisions about your financial future.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <Link href="/articles">
              <Badge
                variant={!selectedCategory ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
              >
                All Articles
              </Badge>
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/articles?category=${category}`}
              >
                <Badge
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  {CATEGORY_LABELS[category]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {articles.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-8">
                {selectedCategory
                  ? `Showing ${total} articles in ${CATEGORY_LABELS[selectedCategory]}`
                  : `${total} articles`}
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ContentCard
                    key={article.id}
                    title={article.title}
                    slug={article.slug}
                    excerpt={article.excerpt}
                    coverImage={article.coverImage}
                    category={article.category}
                    requiredTier={article.requiredTier}
                    publishedAt={article.publishedAt}
                    readTime={article.readTime}
                    author={article.author}
                    type="article"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No articles found
                {selectedCategory && ` in ${CATEGORY_LABELS[selectedCategory]}`}.
              </p>
              {selectedCategory && (
                <Link
                  href="/articles"
                  className="text-primary hover:underline mt-2 inline-block"
                >
                  View all articles
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
