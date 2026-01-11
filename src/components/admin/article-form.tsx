"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArticleCategory, SubscriptionTier } from "@prisma/client"
import { Save, Eye, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface ArticleFormProps {
  article?: {
    id: string
    title: string
    slug: string
    excerpt: string
    content: string
    coverImage: string | null
    category: ArticleCategory
    tags: string[]
    requiredTier: SubscriptionTier
    published: boolean
    featured: boolean
    readTime: number | null
  }
  authorId: string
}

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: "BROKER_REVIEW", label: "Broker Review" },
  { value: "INVESTING_GUIDE", label: "Investing Guide" },
  { value: "BASICS", label: "Basics" },
  { value: "MARKET_ANALYSIS", label: "Market Analysis" },
  { value: "PORTFOLIO_STRATEGY", label: "Portfolio Strategy" },
  { value: "NEWS", label: "News" },
]

const TIERS: { value: SubscriptionTier; label: string }[] = [
  { value: "FREE", label: "Free (Public)" },
  { value: "AUTHENTICATED", label: "Members Only" },
]

export function ArticleForm({ article, authorId }: ArticleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    excerpt: article?.excerpt || "",
    content: article?.content || "",
    coverImage: article?.coverImage || "",
    category: article?.category || "BASICS",
    tags: article?.tags.join(", ") || "",
    requiredTier: article?.requiredTier || "FREE",
    published: article?.published || false,
    featured: article?.featured || false,
    readTime: article?.readTime?.toString() || "",
  })

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }))
  }

  const handleSubmit = async (e: React.FormEvent, publish?: boolean) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        coverImage: formData.coverImage || null,
        category: formData.category,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        requiredTier: formData.requiredTier,
        published: publish !== undefined ? publish : formData.published,
        featured: formData.featured,
        readTime: formData.readTime ? parseInt(formData.readTime) : null,
        authorId,
      }

      const url = article
        ? `/api/admin/content/articles/${article.id}`
        : "/api/admin/content/articles"

      const response = await fetch(url, {
        method: article ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save article")
      }

      router.push("/admin/content/articles")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/content/articles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {article ? "Edit Article" : "New Article"}
            </h1>
            <p className="text-gray-500 mt-1">
              {article
                ? "Update your article content and settings"
                : "Create a new article or guide"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {article && (
            <Button variant="outline" asChild>
              <Link href={`/articles/${article.slug}`} target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Link>
            </Button>
          )}
          {formData.published ? (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, false)}
              disabled={isLoading}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isLoading}
            >
              Publish
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter article title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">/articles/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="article-url-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt *
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                  }
                  required
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description for article cards and SEO"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (Markdown/MDX) *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  required
                  rows={20}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Write your article content in Markdown..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Supports Markdown and MDX syntax
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={formData.published ? "default" : "secondary"}>
                  {formData.published ? "Published" : "Draft"}
                </Badge>
                {formData.featured && <Badge variant="outline">Featured</Badge>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      featured: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="featured" className="text-sm text-gray-700">
                  Featured article
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as ArticleCategory,
                    }))
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Tier
                </label>
                <select
                  value={formData.requiredTier}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requiredTier: e.target.value as SubscriptionTier,
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIERS.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Minimum subscription tier to access this content
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="investing, stocks, beginner"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Comma-separated tags
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Read Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.readTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      readTime: e.target.value,
                    }))
                  }
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-calculated if empty"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coverImage: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                {formData.coverImage && (
                  <img
                    src={formData.coverImage}
                    alt="Cover preview"
                    className="mt-2 rounded-lg max-h-40 object-cover"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
