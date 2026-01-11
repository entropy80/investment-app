import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getVideos } from "@/lib/content/content-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Video, Plus, Search, Eye, Pencil } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams

  const { videos, total } = await getVideos()

  // Filter by search if provided
  const filteredVideos = params.search
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(params.search!.toLowerCase()) ||
          v.description.toLowerCase().includes(params.search!.toLowerCase())
      )
    : videos

  // Statistics
  const publishedCount = videos.filter((v) => v.published).length
  const draftCount = videos.filter((v) => !v.published).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-500 mt-1">
            Manage video tutorials and educational content
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/videos/new">
            <Plus className="h-4 w-4 mr-2" />
            New Video
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex gap-4">
            <input
              type="text"
              name="search"
              placeholder="Search by title or description..."
              defaultValue={params.search || ""}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit">Search</Button>
            {params.search && (
              <Button variant="outline" asChild>
                <a href="/admin/content/videos">Clear</a>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Videos Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            All Videos
          </CardTitle>
          <CardDescription>
            {params.search
              ? `Showing ${filteredVideos.length} results for "${params.search}"`
              : `${total} total videos`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{video.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        /{video.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{video.platform}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatDuration(video.duration)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        video.requiredTier === "FREE"
                          ? "outline"
                          : "default"
                      }
                    >
                      {video.requiredTier === "FREE" ? "Free" : "Members Only"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={video.published ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {video.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {video.author.name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {format(new Date(video.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/videos/${video.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/content/videos/${video.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVideos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No videos found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
