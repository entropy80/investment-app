import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { SubscriptionTier } from "@prisma/client"
import { Clock, Lock } from "lucide-react"
import { format } from "date-fns"
import { getTierBadgeVariant, getTierDisplayName } from "@/lib/content/access"

interface ContentCardProps {
  title: string
  slug: string
  excerpt: string
  coverImage?: string | null
  category?: string
  requiredTier: SubscriptionTier
  publishedAt?: Date | null
  readTime?: number | null
  author?: { name: string | null }
  type: "article" | "video" | "review"
}

export function ContentCard({
  title,
  slug,
  excerpt,
  coverImage,
  category,
  requiredTier,
  publishedAt,
  readTime,
  author,
  type,
}: ContentCardProps) {
  const href = `/${type === "article" ? "articles" : type === "video" ? "videos" : "reviews"}/${slug}`
  const isGated = requiredTier !== "FREE"

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={href}>
        {coverImage && (
          <div className="aspect-video relative overflow-hidden">
            <img
              src={coverImage}
              alt={title}
              className="object-cover w-full h-full"
            />
            {isGated && (
              <div className="absolute top-2 right-2">
                <Badge variant={getTierBadgeVariant(requiredTier)} className="gap-1">
                  <Lock className="h-3 w-3" />
                  {getTierDisplayName(requiredTier)}
                </Badge>
              </div>
            )}
          </div>
        )}
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {category && (
              <Badge variant="outline" className="text-xs">
                {category.replace(/_/g, " ")}
              </Badge>
            )}
            {!coverImage && isGated && (
              <Badge variant={getTierBadgeVariant(requiredTier)} className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                {getTierDisplayName(requiredTier)}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
            {title}
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm line-clamp-3">{excerpt}</p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            {publishedAt && (
              <span>{format(new Date(publishedAt), "MMM d, yyyy")}</span>
            )}
            {readTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readTime} min read
              </span>
            )}
          </div>
          {author?.name && <span>By {author.name}</span>}
        </CardFooter>
      </Link>
    </Card>
  )
}
