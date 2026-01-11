import { prisma } from '@/lib/prisma'
import { Article, Video, BrokerReview, ArticleCategory, SubscriptionTier, VideoPlatform, Prisma } from '@prisma/client'

// ============================================================================
// Article Service
// ============================================================================

export type ArticleWithAuthor = Article & {
  author: { id: string; name: string | null; image: string | null }
}

export type CreateArticleInput = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage?: string
  category: ArticleCategory
  tags?: string[]
  requiredTier?: SubscriptionTier
  published?: boolean
  featured?: boolean
  readTime?: number
  authorId: string
}

export type UpdateArticleInput = Partial<Omit<CreateArticleInput, 'authorId'>>

export async function createArticle(data: CreateArticleInput): Promise<Article> {
  return prisma.article.create({
    data: {
      ...data,
      tags: data.tags || [],
      publishedAt: data.published ? new Date() : null,
    },
  })
}

export async function updateArticle(id: string, data: UpdateArticleInput): Promise<Article> {
  const article = await prisma.article.findUnique({ where: { id } })

  // Set publishedAt when publishing for the first time
  let publishedAt = undefined
  if (data.published === true && article && !article.publishedAt) {
    publishedAt = new Date()
  }

  return prisma.article.update({
    where: { id },
    data: {
      ...data,
      publishedAt,
    },
  })
}

export async function deleteArticle(id: string): Promise<Article> {
  return prisma.article.delete({ where: { id } })
}

export async function getArticleById(id: string): Promise<ArticleWithAuthor | null> {
  return prisma.article.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithAuthor | null> {
  return prisma.article.findUnique({
    where: { slug },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })
}

export async function getArticles(options?: {
  published?: boolean
  category?: ArticleCategory
  featured?: boolean
  requiredTier?: SubscriptionTier
  limit?: number
  offset?: number
}): Promise<{ articles: ArticleWithAuthor[]; total: number }> {
  const where: Prisma.ArticleWhereInput = {}

  if (options?.published !== undefined) where.published = options.published
  if (options?.category) where.category = options.category
  if (options?.featured !== undefined) where.featured = options.featured
  if (options?.requiredTier) where.requiredTier = options.requiredTier

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.article.count({ where }),
  ])

  return { articles, total }
}

export async function getPublishedArticles(options?: {
  category?: ArticleCategory
  limit?: number
  offset?: number
}): Promise<{ articles: ArticleWithAuthor[]; total: number }> {
  return getArticles({ ...options, published: true })
}

// ============================================================================
// Video Service
// ============================================================================

export type VideoWithAuthor = Video & {
  author: { id: string; name: string | null; image: string | null }
}

export type CreateVideoInput = {
  title: string
  slug: string
  description: string
  embedUrl: string
  platform?: VideoPlatform
  duration?: number
  thumbnail?: string
  category: string
  requiredTier?: SubscriptionTier
  published?: boolean
  authorId: string
}

export type UpdateVideoInput = Partial<Omit<CreateVideoInput, 'authorId'>>

export async function createVideo(data: CreateVideoInput): Promise<Video> {
  return prisma.video.create({
    data: {
      ...data,
      publishedAt: data.published ? new Date() : null,
    },
  })
}

export async function updateVideo(id: string, data: UpdateVideoInput): Promise<Video> {
  const video = await prisma.video.findUnique({ where: { id } })

  let publishedAt = undefined
  if (data.published === true && video && !video.publishedAt) {
    publishedAt = new Date()
  }

  return prisma.video.update({
    where: { id },
    data: {
      ...data,
      publishedAt,
    },
  })
}

export async function deleteVideo(id: string): Promise<Video> {
  return prisma.video.delete({ where: { id } })
}

export async function getVideoById(id: string): Promise<VideoWithAuthor | null> {
  return prisma.video.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })
}

export async function getVideoBySlug(slug: string): Promise<VideoWithAuthor | null> {
  return prisma.video.findUnique({
    where: { slug },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })
}

export async function getVideos(options?: {
  published?: boolean
  category?: string
  requiredTier?: SubscriptionTier
  limit?: number
  offset?: number
}): Promise<{ videos: VideoWithAuthor[]; total: number }> {
  const where: Prisma.VideoWhereInput = {}

  if (options?.published !== undefined) where.published = options.published
  if (options?.category) where.category = options.category
  if (options?.requiredTier) where.requiredTier = options.requiredTier

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.video.count({ where }),
  ])

  return { videos, total }
}

// ============================================================================
// Broker Review Service
// ============================================================================

export type BrokerReviewWithAuthor = BrokerReview & {
  author: { id: string; name: string | null; image: string | null }
}

export type CreateBrokerReviewInput = {
  brokerName: string
  slug: string
  logo?: string
  summary: string
  content: string
  overallRating: number
  feesRating: number
  platformRating: number
  supportRating: number
  pros?: string[]
  cons?: string[]
  affiliateLink?: string
  requiredTier?: SubscriptionTier
  published?: boolean
  authorId: string
}

export type UpdateBrokerReviewInput = Partial<Omit<CreateBrokerReviewInput, 'authorId'>>

export async function createBrokerReview(data: CreateBrokerReviewInput): Promise<BrokerReview> {
  return prisma.brokerReview.create({
    data: {
      ...data,
      pros: data.pros || [],
      cons: data.cons || [],
      publishedAt: data.published ? new Date() : null,
    },
  })
}

export async function updateBrokerReview(id: string, data: UpdateBrokerReviewInput): Promise<BrokerReview> {
  const review = await prisma.brokerReview.findUnique({ where: { id } })

  let publishedAt = undefined
  if (data.published === true && review && !review.publishedAt) {
    publishedAt = new Date()
  }

  return prisma.brokerReview.update({
    where: { id },
    data: {
      ...data,
      publishedAt,
    },
  })
}

export async function deleteBrokerReview(id: string): Promise<BrokerReview> {
  return prisma.brokerReview.delete({ where: { id } })
}

export async function getBrokerReviewById(id: string): Promise<BrokerReviewWithAuthor | null> {
  return prisma.brokerReview.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })
}

export async function getBrokerReviewBySlug(slug: string): Promise<BrokerReviewWithAuthor | null> {
  return prisma.brokerReview.findUnique({
    where: { slug },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })
}

export async function getBrokerReviews(options?: {
  published?: boolean
  requiredTier?: SubscriptionTier
  limit?: number
  offset?: number
}): Promise<{ reviews: BrokerReviewWithAuthor[]; total: number }> {
  const where: Prisma.BrokerReviewWhereInput = {}

  if (options?.published !== undefined) where.published = options.published
  if (options?.requiredTier) where.requiredTier = options.requiredTier

  const [reviews, total] = await Promise.all([
    prisma.brokerReview.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.brokerReview.count({ where }),
  ])

  return { reviews, total }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function estimateReadTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}
