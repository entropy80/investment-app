/**
 * Local Storage File Serving API
 * Serves files from local filesystem with authentication
 * Only active when using local storage provider
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFile, stat } from "fs/promises"
import { join } from "path"
import { getStorageProvider } from "@/lib/storage"

interface RouteParams {
  params: Promise<{ path: string[] }>
}

// MIME type mapping for common file types
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".csv": "text/csv",
  ".txt": "text/plain",
}

/**
 * GET /api/storage/[...path]
 * Serve files from local storage
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check if we're using local storage
    const provider = getStorageProvider()
    if (provider !== "local") {
      return NextResponse.json(
        { error: "Local storage not enabled" },
        { status: 404 }
      )
    }

    // Authenticate the request
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the file path from URL
    const { path: pathSegments } = await params
    const relativePath = pathSegments.join("/")

    // Security: Validate the path doesn't escape the storage directory
    if (
      relativePath.includes("..") ||
      relativePath.includes("//") ||
      relativePath.startsWith("/")
    ) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      )
    }

    // Security: Verify the user owns this file
    // File path format: documents/{userId}/{portfolioId}/{filename}
    const pathParts = relativePath.split("/")
    if (pathParts.length >= 2 && pathParts[0] === "documents") {
      const fileUserId = pathParts[1]
      if (fileUserId !== session.user.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    }

    // Build full path
    const basePath = process.env.STORAGE_LOCAL_PATH || "./uploads"
    const fullPath = join(basePath, relativePath)

    // Verify file exists and get stats
    try {
      await stat(fullPath)
    } catch {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(fullPath)

    // Determine content type from extension
    const ext = relativePath.toLowerCase().match(/\.[^.]+$/)?.[0] || ""
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        // Security headers
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}
