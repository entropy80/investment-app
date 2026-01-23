/**
 * Storage Module
 * Public API for file storage operations
 */

// Types
export type {
  StorageAdapter,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "./types"

// Main functions
export {
  getStorageAdapter,
  uploadFile,
  deleteFile,
  isStorageConfigured,
  getStorageProvider,
  resetStorageAdapter,
} from "./storage"

// Adapters (for advanced use cases)
export { VercelBlobAdapter } from "./adapters/vercel-blob"
export { LocalStorageAdapter } from "./adapters/local"
