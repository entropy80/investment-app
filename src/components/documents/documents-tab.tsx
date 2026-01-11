"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  FileSpreadsheet,
  Image,
  File,
} from "lucide-react"

// Document categories with labels
const DOCUMENT_CATEGORIES = [
  { value: "TAX_1099_DIV", label: "1099-DIV (Dividends)" },
  { value: "TAX_1099_INT", label: "1099-INT (Interest)" },
  { value: "TAX_1099_B", label: "1099-B (Broker)" },
  { value: "TAX_K1", label: "K-1 (Partnership)" },
  { value: "TAX_SUMMARY", label: "Tax Summary" },
  { value: "TAX_OTHER", label: "Other Tax Document" },
  { value: "STATEMENT_MONTHLY", label: "Monthly Statement" },
  { value: "STATEMENT_QUARTERLY", label: "Quarterly Statement" },
  { value: "STATEMENT_ANNUAL", label: "Annual Statement" },
  { value: "PROOF_OF_FUNDS", label: "Proof of Funds" },
  { value: "IMPORTED_CSV", label: "Imported CSV" },
  { value: "OTHER", label: "Other" },
]

// Generate year options (current year back to 10 years ago)
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => currentYear - i)

interface Document {
  id: string
  name: string
  displayName: string | null
  category: string
  mimeType: string
  size: number
  storageUrl: string
  year: number | null
  notes: string | null
  uploadedAt: string
}

interface DocumentsTabProps {
  portfolioId: string
  isDemo?: boolean
}

export function DocumentsTab({ portfolioId, isDemo = false }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState("")
  const [uploadYear, setUploadYear] = useState("")
  const [uploadDisplayName, setUploadDisplayName] = useState("")
  const [uploadNotes, setUploadNotes] = useState("")

  // Delete dialog state
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (hasFetched) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}/documents`)
      if (!res.ok) throw new Error("Failed to fetch documents")
      const data = await res.json()
      setDocuments(data.documents || [])
      setHasFetched(true)
    } catch (err) {
      setError("Failed to load documents")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [portfolioId, hasFetched])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill display name from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      setUploadDisplayName(nameWithoutExt)
    }
  }

  // Upload document
  const handleUpload = async () => {
    if (!selectedFile || !uploadCategory) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("category", uploadCategory)
      if (uploadDisplayName) formData.append("displayName", uploadDisplayName)
      if (uploadYear) formData.append("year", uploadYear)
      if (uploadNotes) formData.append("notes", uploadNotes)

      const res = await fetch(`/api/portfolio/${portfolioId}/documents`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      setDocuments((prev) => [data.document, ...prev])

      // Reset form
      setUploadOpen(false)
      setSelectedFile(null)
      setUploadCategory("")
      setUploadYear("")
      setUploadDisplayName("")
      setUploadNotes("")
    } catch (err: any) {
      setError(err.message || "Failed to upload document")
    } finally {
      setUploading(false)
    }
  }

  // Delete document
  const handleDelete = async () => {
    if (!deleteDoc) return

    setDeleting(true)
    try {
      const res = await fetch(
        `/api/portfolio/${portfolioId}/documents/${deleteDoc.id}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Failed to delete document")

      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id))
      setDeleteDoc(null)
    } catch (err) {
      setError("Failed to delete document")
    } finally {
      setDeleting(false)
    }
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return <FileText className="h-4 w-4" />
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />
    if (mimeType.includes("csv") || mimeType.includes("excel"))
      return <FileSpreadsheet className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  // Get category label
  const getCategoryLabel = (category: string) => {
    return (
      DOCUMENT_CATEGORIES.find((c) => c.value === category)?.label || category
    )
  }

  // Load documents on first render
  if (!hasFetched && !loading) {
    fetchDocuments()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header with upload button */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </div>
          {!isDemo && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Upload a PDF, image, or CSV file (max 10MB)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv"
                      onChange={handleFileSelect}
                    />
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">
                        {selectedFile.name} ({formatSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={uploadCategory}
                      onValueChange={setUploadCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year (optional)</Label>
                    <Select value={uploadYear} onValueChange={setUploadYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name (optional)</Label>
                    <Input
                      id="displayName"
                      value={uploadDisplayName}
                      onChange={(e) => setUploadDisplayName(e.target.value)}
                      placeholder="Custom name for this document"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      placeholder="Add notes about this document"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !uploadCategory || uploading}
                  >
                    {uploading && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Upload
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No documents yet</h3>
            <p className="text-muted-foreground mt-2">
              Upload tax forms, statements, or other documents to keep them
              organized
            </p>
          </div>
        )}

        {/* Documents table */}
        {!loading && documents.length > 0 && (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Year</TableHead>
                    <TableHead className="hidden lg:table-cell">Size</TableHead>
                    <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.mimeType)}
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {doc.displayName || doc.name}
                            </p>
                            {doc.displayName && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {getCategoryLabel(doc.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {doc.year || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatSize(doc.size)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a
                              href={doc.storageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          {!isDemo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDoc(doc)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteDoc?.displayName || deleteDoc?.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
