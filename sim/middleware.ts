import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  // Check if the path is exactly /w
  if (request.nextUrl.pathname === '/w') {
    return NextResponse.redirect(new URL('/w/1', request.url))
  }

  // DEVELOPMENT MODE - Skip authentication check
  // Comment out or remove this if-statement in production
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

// TODO: Add protected routes
export const config = {
  matcher: [
    '/w', // Match exactly /w
    '/w/:path*', // Keep existing matcher for protected routes
  ],
}
