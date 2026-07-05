import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth middleware: checks session cookie, redirects unauthenticated users.
 * Lightweight — full session validation happens in Server Components/Actions.
 */

const publicPaths = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
])

const publicPrefixes = ['/api/webhooks', '/api/public']

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return true
  return publicPrefixes.some(prefix => pathname.startsWith(prefix))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for session token
  const sessionToken =
    request.cookies.get('__Secure-next-auth.session-token')?.value ??
    request.cookies.get('next-auth.session-token')?.value

  if (!sessionToken) {
    // Redirect to login with callback URL
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Optionally: check token expiry (edge-compatible JWT decode)
  // const payload = decodeJwt(sessionToken) // using 'jose' library
  // if (payload.exp && payload.exp * 1000 < Date.now()) {
  //   return NextResponse.redirect(new URL('/login', request.url))
  // }

  // Add useful headers for Server Components
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Public assets in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
