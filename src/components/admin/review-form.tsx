"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubscriptionTier } from "@prisma/client"
import { Save, Eye, ArrowLeft, Loader2, Star } from "lucide-react"
import Link from "next/link"

interface ReviewFormProps {
  review?: {
    id: string
    brokerName: string
    slug: string
    logo: string | null
    summary: string
    content: string
    overallRating: number
    feesRating: number
    platformRating: number
    supportRating: number
    pros: string[]
    cons: string[]
    affiliateLink: string | null
    requiredTier: SubscriptionTier
    published: boolean
  }
  authorId: string
}

const TIERS: { value: SubscriptionTier; label: string }[] = [
  { value: "FREE", label: "Free (Public)" },
  { value: "AUTHENTICATED", label: "Members Only" },
]

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <div className="flex items-center gap-1 min-w-[60px]">
          <span className="font-medium">{value.toFixed(1)}</span>
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        </div>
      </div>
    </div>
  )
}

export function ReviewForm({ review, authorId }: ReviewFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    brokerName: review?.brokerName || "",
    slug: review?.slug || "",
    logo: review?.logo || "",
    summary: review?.summary || "",
    content: review?.content || "",
    overallRating: review?.overallRating || 3,
    feesRating: review?.feesRating || 3,
    platformRating: review?.platformRating || 3,
    supportRating: review?.supportRating || 3,
    pros: review?.pros.join("\n") || "",
    cons: review?.cons.join("\n") || "",
    affiliateLink: review?.affiliateLink || "",
    requiredTier: review?.requiredTier || "FREE",
    published: review?.published || false,
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const brokerName = e.target.value
    setFormData((prev) => ({
      ...prev,
      brokerName,
      slug: prev.slug || generateSlug(brokerName),
    }))
  }

  const handleSubmit = async (e: React.FormEvent, publish?: boolean) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        brokerName: formData.brokerName,
        slug: formData.slug,
        logo: formData.logo || null,
        summary: formData.summary,
        content: formData.content,
        overallRating: formData.overallRating,
        feesRating: formData.feesRating,
        platformRating: formData.platformRating,
        supportRating: formData.supportRating,
        pros: formData.pros
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        cons: formData.cons
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean),
        affiliateLink: formData.affiliateLink || null,
        requiredTier: formData.requiredTier,
        published: publish !== undefined ? publish : formData.published,
        authorId,
      }

      const url = review
        ? `/api/admin/content/reviews/${review.id}`
        : "/api/admin/content/reviews"

      const response = await fetch(url, {
        method: review ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save review")
      }

      router.push("/admin/content/reviews")
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
            <Link href="/admin/content/reviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {review ? "Edit Review" : "New Review"}
            </h1>
            <p className="text-gray-500 mt-1">
              {review
                ? "Update your broker review"
                : "Create a new broker review"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review && (
            <Button variant="outline" asChild>
              <Link href={`/reviews/${review.slug}`} target="_blank">
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
              <CardTitle>Broker Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Broker Name *
                </label>
                <input
                  type="text"
                  value={formData.brokerName}
                  onChange={handleNameChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Interactive Brokers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">/reviews/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="broker-url-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary *
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  required
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief overview of the broker"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Review (Markdown/MDX) *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  required
                  rows={15}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Write your detailed review in Markdown..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pros & Cons</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pros (one per line)
                </label>
                <textarea
                  value={formData.pros}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pros: e.target.value }))
                  }
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Low fees&#10;Great platform&#10;Excellent research tools"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cons (one per line)
                </label>
                <textarea
                  value={formData.cons}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cons: e.target.value }))
                  }
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Complex for beginners&#10;Limited customer support hours"
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
              <CardTitle>Ratings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RatingInput
                label="Overall Rating"
                value={formData.overallRating}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, overallRating: value }))
                }
              />
              <RatingInput
                label="Fees Rating"
                value={formData.feesRating}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, feesRating: value }))
                }
              />
              <RatingInput
                label="Platform Rating"
                value={formData.platformRating}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, platformRating: value }))
                }
              />
              <RatingInput
                label="Support Rating"
                value={formData.supportRating}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, supportRating: value }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  Affiliate Link
                </label>
                <input
                  type="url"
                  value={formData.affiliateLink}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      affiliateLink: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, logo: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                {formData.logo && (
                  <img
                    src={formData.logo}
                    alt="Logo preview"
                    className="mt-2 h-16 object-contain"
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
