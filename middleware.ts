import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware function - authentication has been removed
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return NextResponse.next()
  }

  // Allow access to login and register pages
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return NextResponse.next()
  }

  // Protect all admin routes - dashboard and all admin pages
  const adminRoutes = [
    '/',
    '/orders',
    '/products',
    '/listings',
    '/message',
    '/discounts',
    '/content',
    '/dynamic-pages',
    '/customers',
    '/reviews',
    '/analytics',
    '/blogs',
    '/pages',
    '/support'
  ];

  const isAdminRoute = adminRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  ) || pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (isAdminRoute) {
    // Authentication has been removed - allow all access
    // TODO: Re-implement authentication when needed
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/orders/:path*',
    '/products/:path*',
    '/listings/:path*',
    '/message/:path*',
    '/discounts/:path*',
    '/content/:path*',
    '/dynamic-pages/:path*',
    '/customers/:path*',
    '/reviews/:path*',
    '/analytics/:path*',
    '/blogs/:path*',
    '/pages/:path*',
    '/support/:path*',
    '/admin/:path*',
    '/api/admin/:path*'
  ]
}