import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createArticle, getArticles } from "@/lib/content/content-service"
import { ArticleCategory, SubscriptionTier } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category") as ArticleCategory | null
    const published = searchParams.get("published")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    const { articles, total } = await getArticles({
      category: category || undefined,
      published: published ? published === "true" : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    return NextResponse.json({ articles, total })
  } catch (error) {
    console.error("Error fetching articles:", error)
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      requiredTier,
      published,
      featured,
      readTime,
      authorId,
    } = body

    // Validation
    if (!title || !slug || !excerpt || !content || !category || !authorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const article = await createArticle({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category: category as ArticleCategory,
      tags: tags || [],
      requiredTier: (requiredTier as SubscriptionTier) || "FREE",
      published: published || false,
      featured: featured || false,
      readTime,
      authorId,
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error: any) {
    console.error("Error creating article:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An article with this slug already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    )
  }
}
