import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuth = !!token
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth/")
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin")

  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!isAuth) {
    let from = request.nextUrl.pathname
    if (request.nextUrl.search) {
      from += request.nextUrl.search
    }

    return NextResponse.redirect(
      new URL(`/auth/signin?from=${encodeURIComponent(from)}`, request.url)
    )
  }

  // Admin route protection - check for ADMIN or SUPER_ADMIN role
  if (isAdminPage) {
    const userRole = token?.role as string
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Note: /demo is excluded - it handles its own auth flow
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"]
}
