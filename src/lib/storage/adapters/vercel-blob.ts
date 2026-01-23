/**
 * Vercel Blob Storage Adapter
 * Wraps @vercel/blob for use with the storage abstraction layer
 */

import { put, del } from "@vercel/blob"
import type { StorageAdapter, UploadOptions, UploadResult, StorageProvider } from "../types"

export class VercelBlobAdapter implements StorageAdapter {
  /**
   * Upload a file to Vercel Blob storage
   */
  async upload(
    path: string,
    data: Buffer | Blob | File,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const blob = await put(path, data, {
      access: options?.access ?? "public",
      addRandomSuffix: options?.addRandomSuffix ?? true,
      contentType: options?.contentType,
    })

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    }
  }

  /**
   * Delete a file from Vercel Blob storage
   */
  async delete(url: string): Promise<void> {
    await del(url)
  }

  /**
   * Check if Vercel Blob is configured
   * The BLOB_READ_WRITE_TOKEN is auto-set by Vercel when Blob storage is enabled
   */
  isConfigured(): boolean {
    return !!process.env.BLOB_READ_WRITE_TOKEN
  }

  /**
   * Get provider name
   */
  getProviderName(): StorageProvider {
    return "vercel_blob"
  }
}
