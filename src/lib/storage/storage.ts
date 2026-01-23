/**
 * Storage Service
 * Provides a unified interface for file storage operations
 * Automatically selects the appropriate storage provider based on configuration
 */

import type { StorageAdapter, StorageProvider, UploadOptions, UploadResult } from "./types"
import { VercelBlobAdapter } from "./adapters/vercel-blob"
import { LocalStorageAdapter } from "./adapters/local"

// Singleton adapter instance
let adapter: StorageAdapter | null = null

/**
 * Detect the appropriate storage provider based on environment
 */
function detectProvider(): StorageProvider {
  // Check for explicit configuration
  const configuredProvider = process.env.STORAGE_PROVIDER as StorageProvider | undefined

  if (configuredProvider) {
    return configuredProvider
  }

  // Auto-detect based on environment
  if (process.env.VERCEL) {
    // Running on Vercel - use Vercel Blob
    return "vercel_blob"
  }

  // Default to local storage for self-hosted deployments
  return "local"
}

/**
 * Create a storage adapter based on the provider
 */
function createAdapter(provider: StorageProvider): StorageAdapter {
  switch (provider) {
    case "vercel_blob":
      return new VercelBlobAdapter()
    case "local":
      return new LocalStorageAdapter()
    case "s3":
      // S3 adapter not yet implemented - fall back to local
      console.warn("S3 storage adapter not yet implemented, falling back to local storage")
      return new LocalStorageAdapter()
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }
}

/**
 * Get the configured storage adapter (singleton)
 */
export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    const provider = detectProvider()
    adapter = createAdapter(provider)

    // Warn if the adapter is not properly configured
    if (!adapter.isConfigured()) {
      console.warn(
        `Storage provider "${provider}" may not be fully configured. ` +
          `Check your environment variables.`
      )
    }
  }

  return adapter
}

/**
 * Upload a file to storage
 * Convenience function that uses the configured adapter
 */
export async function uploadFile(
  path: string,
  data: Buffer | Blob,
  options?: UploadOptions
): Promise<UploadResult> {
  const storageAdapter = getStorageAdapter()
  return storageAdapter.upload(path, data, options)
}

/**
 * Delete a file from storage
 * Convenience function that uses the configured adapter
 */
export async function deleteFile(url: string): Promise<void> {
  const storageAdapter = getStorageAdapter()
  return storageAdapter.delete(url)
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  const storageAdapter = getStorageAdapter()
  return storageAdapter.isConfigured()
}

/**
 * Get the current storage provider name
 */
export function getStorageProvider(): StorageProvider {
  const storageAdapter = getStorageAdapter()
  return storageAdapter.getProviderName()
}

/**
 * Reset the adapter (useful for testing)
 */
export function resetStorageAdapter(): void {
  adapter = null
}
