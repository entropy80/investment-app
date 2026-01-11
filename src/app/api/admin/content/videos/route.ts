import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createVideo, getVideos } from "@/lib/content/content-service"
import { VideoPlatform, SubscriptionTier } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const published = searchParams.get("published")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    const { videos, total } = await getVideos({
      category: category || undefined,
      published: published ? published === "true" : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    return NextResponse.json({ videos, total })
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json(
      { error: "Failed to fetch videos" },
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
      description,
      embedUrl,
      platform,
      duration,
      thumbnail,
      category,
      requiredTier,
      published,
      authorId,
    } = body

    // Validation
    if (!title || !slug || !description || !embedUrl || !category || !authorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const video = await createVideo({
      title,
      slug,
      description,
      embedUrl,
      platform: (platform as VideoPlatform) || "YOUTUBE",
      duration,
      thumbnail,
      category,
      requiredTier: (requiredTier as SubscriptionTier) || "FREE",
      published: published || false,
      authorId,
    })

    return NextResponse.json(video, { status: 201 })
  } catch (error: any) {
    console.error("Error creating video:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A video with this slug already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    )
  }
}
