/**
 * Local Filesystem Storage Adapter
 * Stores files on the local filesystem, useful for self-hosted deployments
 */

import { mkdir, writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"
import { join, dirname } from "path"
import { randomBytes } from "crypto"
import type { StorageAdapter, UploadOptions, UploadResult, StorageProvider } from "../types"

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string
  private baseUrl: string

  constructor() {
    // Default to ./uploads relative to project root, or use env var
    this.basePath = process.env.STORAGE_LOCAL_PATH || "./uploads"
    // URL path for serving files (handled by API route)
    this.baseUrl = process.env.STORAGE_LOCAL_URL || "/api/storage"
  }

  /**
   * Generate a random suffix for unique filenames
   */
  private generateSuffix(): string {
    return randomBytes(8).toString("hex")
  }

  /**
   * Get the file extension from filename
   */
  private getExtension(filename: string): string {
    const parts = filename.split(".")
    return parts.length > 1 ? `.${parts.pop()}` : ""
  }

  /**
   * Get filename without extension
   */
  private getBasename(filename: string): string {
    const ext = this.getExtension(filename)
    return ext ? filename.slice(0, -ext.length) : filename
  }

  /**
   * Upload a file to local filesystem
   */
  async upload(
    path: string,
    data: Buffer | Blob | File,
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Add random suffix if requested (default true)
    let finalPath = path
    if (options?.addRandomSuffix !== false) {
      const ext = this.getExtension(path)
      const basename = this.getBasename(path)
      const suffix = this.generateSuffix()
      finalPath = `${basename}-${suffix}${ext}`
    }

    // Full filesystem path
    const fullPath = join(this.basePath, finalPath)

    // Ensure directory exists
    const dir = dirname(fullPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    // Convert data to Buffer if needed
    let buffer: Buffer
    if (Buffer.isBuffer(data)) {
      buffer = data
    } else if (data instanceof Blob || data instanceof File) {
      const arrayBuffer = await data.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      throw new Error("Unsupported data type for upload")
    }

    // Write file to disk
    await writeFile(fullPath, buffer)

    // Determine content type
    let contentType = options?.contentType
    if (!contentType && data instanceof File) {
      contentType = data.type
    }

    // Generate URL for accessing the file
    const url = `${this.baseUrl}/${finalPath}`

    return {
      url,
      pathname: finalPath,
      contentType,
    }
  }

  /**
   * Delete a file from local filesystem
   */
  async delete(url: string): Promise<void> {
    // Extract path from URL
    // URL format: /api/storage/path/to/file.ext or full URL
    let path: string

    if (url.startsWith(this.baseUrl)) {
      // Remove base URL prefix
      path = url.slice(this.baseUrl.length + 1)
    } else if (url.startsWith("/")) {
      // Assume it's a path relative to storage
      path = url.slice(1)
    } else {
      // Try to parse as URL and extract pathname
      try {
        const parsedUrl = new URL(url)
        const pathname = parsedUrl.pathname
        if (pathname.startsWith(this.baseUrl)) {
          path = pathname.slice(this.baseUrl.length + 1)
        } else {
          path = pathname.slice(1)
        }
      } catch {
        // Assume it's already a relative path
        path = url
      }
    }

    // Full filesystem path
    const fullPath = join(this.basePath, path)

    // Delete file if it exists
    try {
      await unlink(fullPath)
    } catch (err) {
      // Ignore if file doesn't exist (may have been deleted already)
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err
      }
    }
  }

  /**
   * Check if local storage is configured
   * Local storage is always available as it just uses the filesystem
   */
  isConfigured(): boolean {
    return true
  }

  /**
   * Get provider name
   */
  getProviderName(): StorageProvider {
    return "local"
  }
}
