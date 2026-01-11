import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBrokerReviewById, updateBrokerReview, deleteBrokerReview } from "@/lib/content/content-service"
import { SubscriptionTier } from "@prisma/client"

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

    const review = await getBrokerReviewById(id)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error("Error fetching review:", error)
    return NextResponse.json(
      { error: "Failed to fetch review" },
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
      brokerName,
      slug,
      logo,
      summary,
      content,
      overallRating,
      feesRating,
      platformRating,
      supportRating,
      pros,
      cons,
      affiliateLink,
      requiredTier,
      published,
    } = body

    // Validate ratings if provided
    const ratings = [overallRating, feesRating, platformRating, supportRating].filter(
      (r) => r !== undefined
    )
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Ratings must be between 1 and 5" },
          { status: 400 }
        )
      }
    }

    const review = await updateBrokerReview(id, {
      brokerName,
      slug,
      logo,
      summary,
      content,
      overallRating,
      feesRating,
      platformRating,
      supportRating,
      pros,
      cons,
      affiliateLink,
      requiredTier: requiredTier as SubscriptionTier,
      published,
    })

    return NextResponse.json(review)
  } catch (error: any) {
    console.error("Error updating review:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A review with this slug already exists" },
        { status: 400 }
      )
    }

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to update review" },
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

    await deleteBrokerReview(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting review:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    )
  }
}
