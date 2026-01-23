import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile } from "@/lib/storage"
import { demoGuard } from "@/lib/demo/demo-guard"
import { DocumentCategory } from "@prisma/client"

interface RouteParams {
  params: Promise<{ id: string; docId: string }>
}

/**
 * GET /api/portfolio/[id]/documents/[docId]
 * Get a specific document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId, docId } = await params

    const document = await prisma.document.findFirst({
      where: {
        id: docId,
        portfolioId,
        userId: session.user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/portfolio/[id]/documents/[docId]
 * Update document metadata (displayName, category, year, notes)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { id: portfolioId, docId } = await params

    // Verify document ownership
    const existingDoc = await prisma.document.findFirst({
      where: {
        id: docId,
        portfolioId,
        userId: session.user.id,
      },
    })

    if (!existingDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { displayName, category, year, notes } = body

    // Validate category if provided
    if (category && !Object.values(DocumentCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    const document = await prisma.document.update({
      where: { id: docId },
      data: {
        ...(displayName !== undefined && { displayName: displayName || null }),
        ...(category && { category }),
        ...(year !== undefined && { year: year ? parseInt(year, 10) : null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/portfolio/[id]/documents/[docId]
 * Delete a document (also removes from blob storage)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { id: portfolioId, docId } = await params

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: docId,
        portfolioId,
        userId: session.user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Delete from storage (provider determined by configuration)
    try {
      await deleteFile(document.storageUrl)
    } catch (storageError) {
      console.error("Error deleting file from storage:", storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: docId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
