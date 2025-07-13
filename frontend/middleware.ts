import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the session cookie
  const session = request.cookies.get('session')

  // Check if the request is for an API route that requires authentication
  if (request.nextUrl.pathname.startsWith('/api/user/')) {
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/user/:path*',
  ],
}