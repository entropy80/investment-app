import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
import { Users, Search } from "lucide-react"
import { format } from "date-fns"
import { UserRoleSelect } from "@/components/admin/user-role-select"

async function getUsers(searchQuery?: string) {
  const users = await prisma.user.findMany({
    where: searchQuery
      ? {
          OR: [
            { email: { contains: searchQuery, mode: "insensitive" } },
            { name: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: {
        select: {
          sessions: true,
          portfolios: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return users
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams
  const users = await getUsers(params.search)

  // User statistics
  const totalUsers = users.length
  const adminCount = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length
  const verifiedCount = users.filter((u) => u.emailVerified).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Verified Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex gap-4">
            <input
              type="text"
              name="search"
              placeholder="Search by email or name..."
              defaultValue={params.search || ""}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit">Search</Button>
            {params.search && (
              <Button variant="outline" asChild>
                <a href="/admin/users">Clear</a>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {params.search
              ? `Showing ${users.length} results for "${params.search}"`
              : `${users.length} total users`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Portfolios</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || "No name"}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserRoleSelect
                        userId={user.id}
                        currentRole={user.role}
                        disabled={user.id === session?.user?.id}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.emailVerified ? (
                          <Badge variant="default" className="w-fit">Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="w-fit">Unverified</Badge>
                        )}
                        {user.twoFactorEnabled && (
                          <Badge variant="secondary" className="w-fit">2FA</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user._count.portfolios}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/users/${user.id}`}>View</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No users found
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
