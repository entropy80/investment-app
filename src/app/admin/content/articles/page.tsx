import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getArticles } from "@/lib/content/content-service"
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
import { FileText, Plus, Search, Eye, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams

  const { articles, total } = await getArticles({
    category: params.category as any,
  })

  // Filter by search if provided
  const filteredArticles = params.search
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(params.search!.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(params.search!.toLowerCase())
      )
    : articles

  // Statistics
  const publishedCount = articles.filter((a) => a.published).length
  const draftCount = articles.filter((a) => !a.published).length
  const featuredCount = articles.filter((a) => a.featured).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-500 mt-1">
            Create and manage educational articles and guides
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/articles/new">
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Articles
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Featured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{featuredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex gap-4">
            <input
              type="text"
              name="search"
              placeholder="Search by title or excerpt..."
              defaultValue={params.search || ""}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit">Search</Button>
            {params.search && (
              <Button variant="outline" asChild>
                <a href="/admin/content/articles">Clear</a>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Articles
          </CardTitle>
          <CardDescription>
            {params.search
              ? `Showing ${filteredArticles.length} results for "${params.search}"`
              : `${total} total articles`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{article.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        /{article.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {article.category.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        article.requiredTier === "FREE"
                          ? "outline"
                          : "default"
                      }
                    >
                      {article.requiredTier === "FREE" ? "Free" : "Members Only"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={article.published ? "default" : "secondary"}
                        className="w-fit"
                      >
                        {article.published ? "Published" : "Draft"}
                      </Badge>
                      {article.featured && (
                        <Badge variant="outline" className="w-fit">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {article.author.name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {format(new Date(article.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/articles/${article.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/content/articles/${article.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredArticles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No articles found
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
