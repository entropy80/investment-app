import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role
    const userRole = session.user.role
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, role } = body

    // Validate input
    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 }
      )
    }

    // Validate role value
    const validRoles = ["USER", "ADMIN", "SUPER_ADMIN"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Only SUPER_ADMIN can assign SUPER_ADMIN role
    if (role === "SUPER_ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can assign SUPER_ADMIN role" },
        { status: 403 }
      )
    }

    // Prevent self-demotion
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (currentUser?.id === userId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    )
  }
}
