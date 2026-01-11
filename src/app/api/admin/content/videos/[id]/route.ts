import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getVideoById, updateVideo, deleteVideo } from "@/lib/content/content-service"
import { VideoPlatform, SubscriptionTier } from "@prisma/client"

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

    const video = await getVideoById(id)

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error fetching video:", error)
    return NextResponse.json(
      { error: "Failed to fetch video" },
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
      description,
      embedUrl,
      platform,
      duration,
      thumbnail,
      category,
      requiredTier,
      published,
    } = body

    const video = await updateVideo(id, {
      title,
      slug,
      description,
      embedUrl,
      platform: platform as VideoPlatform,
      duration,
      thumbnail,
      category,
      requiredTier: requiredTier as SubscriptionTier,
      published,
    })

    return NextResponse.json(video)
  } catch (error: any) {
    console.error("Error updating video:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A video with this slug already exists" },
        { status: 400 }
      )
    }

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to update video" },
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

    await deleteVideo(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting video:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    )
  }
}
