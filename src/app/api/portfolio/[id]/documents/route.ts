import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"
import { demoGuard } from "@/lib/demo/demo-guard"
import { DocumentCategory } from "@prisma/client"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Allowed file types with their magic bytes (file signatures)
const FILE_SIGNATURES: Record<string, { mimeTypes: string[]; bytes: number[][] }> = {
  pdf: {
    mimeTypes: ["application/pdf"],
    bytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  png: {
    mimeTypes: ["image/png"],
    bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG header
  },
  jpeg: {
    mimeTypes: ["image/jpeg", "image/jpg"],
    bytes: [
      [0xff, 0xd8, 0xff, 0xe0], // JPEG JFIF
      [0xff, 0xd8, 0xff, 0xe1], // JPEG EXIF
      [0xff, 0xd8, 0xff, 0xe8], // JPEG SPIFF
    ],
  },
  csv: {
    mimeTypes: ["text/csv", "application/vnd.ms-excel"],
    bytes: [], // CSV has no magic bytes, validated by content
  },
}

// Allowed MIME types (flattened from signatures)
const ALLOWED_MIME_TYPES = Object.values(FILE_SIGNATURES).flatMap(s => s.mimeTypes)

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Sanitize filename to prevent path traversal and other attacks
 * Only allows alphanumeric, dash, underscore, and dot characters
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[/\\]/).pop() || "file"

  // Replace dangerous characters, keep only safe ones
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace unsafe chars with underscore
    .replace(/\.{2,}/g, ".") // Prevent multiple dots (directory traversal)
    .replace(/^\.+/, "") // Remove leading dots
    .substring(0, 255) // Limit length

  // Ensure we have a valid filename
  return sanitized || "file"
}

/**
 * Validate file content against its declared MIME type using magic bytes
 */
async function validateFileContent(file: File): Promise<{ valid: boolean; error?: string }> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer.slice(0, 16)) // First 16 bytes for signature

  // Find the signature definition for this MIME type
  for (const [, sig] of Object.entries(FILE_SIGNATURES)) {
    if (!sig.mimeTypes.includes(file.type)) continue

    // CSV files don't have magic bytes - check for text content
    if (sig.bytes.length === 0) {
      // For CSV, ensure it's valid text content
      try {
        const text = await file.text()
        // Basic CSV validation: should contain printable ASCII or UTF-8
        if (!/^[\x20-\x7E\r\n\t,;"']+$/m.test(text.substring(0, 1000))) {
          // Allow UTF-8 content as well
          if (!/^[\s\S]*$/.test(text.substring(0, 1000))) {
            return { valid: false, error: "Invalid CSV content" }
          }
        }
        return { valid: true }
      } catch {
        return { valid: false, error: "Could not read file content" }
      }
    }

    // Check magic bytes
    for (const signature of sig.bytes) {
      const matches = signature.every((byte, index) => bytes[index] === byte)
      if (matches) {
        return { valid: true }
      }
    }

    // MIME type matched but magic bytes didn't
    return { valid: false, error: "File content does not match declared type" }
  }

  return { valid: false, error: "Unsupported file type" }
}

/**
 * GET /api/portfolio/[id]/documents
 * List all documents for a portfolio
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: portfolioId } = await params

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: session.user.id,
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    // Get documents for this portfolio
    const documents = await prisma.document.findMany({
      where: {
        portfolioId,
        userId: session.user.id,
      },
      orderBy: { uploadedAt: "desc" },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/[id]/documents
 * Upload a new document
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Block demo users
    const demoResponse = demoGuard(session)
    if (demoResponse) return demoResponse

    const { id: portfolioId } = await params

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: session.user.id,
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const category = formData.get("category") as DocumentCategory | null
    const displayName = formData.get("displayName") as string | null
    const year = formData.get("year") as string | null
    const notes = formData.get("notes") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      )
    }

    // Validate category enum
    if (!Object.values(DocumentCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: PDF, PNG, JPG, CSV" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 413 }
      )
    }

    // Validate file content (magic bytes) to prevent MIME type spoofing
    const contentValidation = await validateFileContent(file)
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error || "Invalid file content" },
        { status: 400 }
      )
    }

    // Sanitize filename to prevent path traversal and injection attacks
    const sanitizedFilename = sanitizeFilename(file.name)

    // Upload to Vercel Blob with private access (requires signed URLs for download)
    const blob = await put(`documents/${session.user.id}/${portfolioId}/${sanitizedFilename}`, file, {
      access: "private",
      addRandomSuffix: true,
    })

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        portfolioId,
        category,
        name: sanitizedFilename,
        displayName: displayName || null,
        mimeType: file.type,
        size: file.size,
        storageUrl: blob.url,
        year: year ? parseInt(year, 10) : null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    )
  }
}
