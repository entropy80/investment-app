/**
 * Storage adapter types and interfaces
 * Provides abstraction layer for different storage providers
 */

export type StorageProvider = "vercel_blob" | "local" | "s3"

export interface UploadOptions {
  /** Access level for the uploaded file */
  access?: "public" | "private"
  /** Add random suffix to prevent filename collisions */
  addRandomSuffix?: boolean
  /** Content type override */
  contentType?: string
}

export interface UploadResult {
  /** The URL where the file can be accessed */
  url: string
  /** The storage path/key of the file */
  pathname: string
  /** Content type of the uploaded file */
  contentType?: string
}

export interface StorageAdapter {
  /**
   * Upload a file to storage
   * @param path - The storage path (e.g., "documents/userId/file.pdf")
   * @param data - The file data as Buffer, Blob, or File
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  upload(
    path: string,
    data: Buffer | Blob | File,
    options?: UploadOptions
  ): Promise<UploadResult>

  /**
   * Delete a file from storage
   * @param url - The URL or storage path of the file to delete
   */
  delete(url: string): Promise<void>

  /**
   * Check if the adapter is properly configured
   * @returns true if all required environment variables are set
   */
  isConfigured(): boolean

  /**
   * Get the provider name
   */
  getProviderName(): StorageProvider
}
