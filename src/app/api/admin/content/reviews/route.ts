import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createBrokerReview, getBrokerReviews } from "@/lib/content/content-service"
import { SubscriptionTier } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const published = searchParams.get("published")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    const { reviews, total } = await getBrokerReviews({
      published: published ? published === "true" : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    return NextResponse.json({ reviews, total })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
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
      authorId,
    } = body

    // Validation
    if (!brokerName || !slug || !summary || !content || !authorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate ratings
    const ratings = [overallRating, feesRating, platformRating, supportRating]
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Ratings must be between 1 and 5" },
          { status: 400 }
        )
      }
    }

    const review = await createBrokerReview({
      brokerName,
      slug,
      logo,
      summary,
      content,
      overallRating,
      feesRating,
      platformRating,
      supportRating,
      pros: pros || [],
      cons: cons || [],
      affiliateLink,
      requiredTier: (requiredTier as SubscriptionTier) || "FREE",
      published: published || false,
      authorId,
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error: any) {
    console.error("Error creating review:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A review with this slug already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    )
  }
}
