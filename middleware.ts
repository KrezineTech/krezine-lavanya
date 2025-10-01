import {auth} from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req: any) => {
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
    // Allow bypassing authentication in development if explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.ADMIN_AUTH_BYPASS === 'true') {
      return NextResponse.next()
    }

    // Check authentication
    const session = req.auth

    if (!session || !session.user) {
      // For API routes, return 401 instead of redirect
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      } else {
        // For page routes, return 401 instead of redirect
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check if user has admin role
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      // For API routes, return 403 instead of redirect
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      } else {
        // For page routes, return 403 instead of redirect
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }
    }
  }

  return NextResponse.next()
})

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