import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // If it's the root path, allow the request
  if (path === "/") {
    return NextResponse.next()
  }

  // If it's an API or _next path, allow the request
  if (path.includes("/api/") || path.includes("/_next/") || path.includes("/fonts/")) {
    return NextResponse.next()
  }

  // Check if the path is for authentication
  const isAuthPath = path.includes("/api/auth") || path === "/login"
  if (isAuthPath) {
    return NextResponse.next()
  }

  // For other paths, check if the user is authenticated
  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value

  // If there's no token and the path requires authentication, redirect to login
  if (!token && path !== "/login" && !path.includes("/docs") && !path.includes("/domains")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
