"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoPlatform, SubscriptionTier } from "@prisma/client"
import { Save, Eye, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface VideoFormProps {
  video?: {
    id: string
    title: string
    slug: string
    description: string
    embedUrl: string
    platform: VideoPlatform
    duration: number | null
    thumbnail: string | null
    category: string
    requiredTier: SubscriptionTier
    published: boolean
  }
  authorId: string
}

const PLATFORMS: { value: VideoPlatform; label: string }[] = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "VIMEO", label: "Vimeo" },
]

const TIERS: { value: SubscriptionTier; label: string }[] = [
  { value: "FREE", label: "Free (Public)" },
  { value: "AUTHENTICATED", label: "Members Only" },
]

const VIDEO_CATEGORIES = [
  "Getting Started",
  "Investing Basics",
  "Portfolio Management",
  "Market Analysis",
  "Broker Tutorials",
  "Advanced Strategies",
]

export function VideoForm({ video, authorId }: VideoFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: video?.title || "",
    slug: video?.slug || "",
    description: video?.description || "",
    embedUrl: video?.embedUrl || "",
    platform: video?.platform || "YOUTUBE",
    duration: video?.duration?.toString() || "",
    thumbnail: video?.thumbnail || "",
    category: video?.category || "Getting Started",
    requiredTier: video?.requiredTier || "FREE",
    published: video?.published || false,
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
        description: formData.description,
        embedUrl: formData.embedUrl,
        platform: formData.platform,
        duration: formData.duration ? parseInt(formData.duration) : null,
        thumbnail: formData.thumbnail || null,
        category: formData.category,
        requiredTier: formData.requiredTier,
        published: publish !== undefined ? publish : formData.published,
        authorId,
      }

      const url = video
        ? `/api/admin/content/videos/${video.id}`
        : "/api/admin/content/videos"

      const response = await fetch(url, {
        method: video ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save video")
      }

      router.push("/admin/content/videos")
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
            <Link href="/admin/content/videos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {video ? "Edit Video" : "New Video"}
            </h1>
            <p className="text-gray-500 mt-1">
              {video
                ? "Update your video details and settings"
                : "Add a new video tutorial"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {video && (
            <Button variant="outline" asChild>
              <Link href={`/videos/${video.slug}`} target="_blank">
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
              <CardTitle>Video Details</CardTitle>
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
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">/videos/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="video-url-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Embed URL *
                </label>
                <input
                  type="url"
                  value={formData.embedUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, embedUrl: e.target.value }))
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://youtube.com/embed/..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  YouTube or Vimeo embed URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  required
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this video covers..."
                />
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
            <CardContent>
              <Badge variant={formData.published ? "default" : "secondary"}>
                {formData.published ? "Published" : "Draft"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform *
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      platform: e.target.value as VideoPlatform,
                    }))
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {VIDEO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration: e.target.value,
                    }))
                  }
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 300 for 5 minutes"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={formData.thumbnail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      thumbnail: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                {formData.thumbnail && (
                  <img
                    src={formData.thumbnail}
                    alt="Thumbnail preview"
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
