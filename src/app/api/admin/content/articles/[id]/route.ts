import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getArticleById, updateArticle, deleteArticle } from "@/lib/content/content-service"
import { ArticleCategory, SubscriptionTier } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const article = await getArticleById(id)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error("Error fetching article:", error)
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

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
    } = body

    const article = await updateArticle(id, {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category: category as ArticleCategory,
      tags,
      requiredTier: requiredTier as SubscriptionTier,
      published,
      featured,
      readTime,
    })

    return NextResponse.json(article)
  } catch (error: any) {
    console.error("Error updating article:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An article with this slug already exists" },
        { status: 400 }
      )
    }

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await deleteArticle(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting article:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    )
  }
}
