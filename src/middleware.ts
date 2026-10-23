import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Guard Admin Frontend Routes (/admin, /admin/...)
  if (pathname === '/admin' || (pathname.startsWith('/admin/') && pathname !== '/admin/login')) {
    const adminToken = request.cookies.get('amm_admin_session_token')?.value
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 2. Guard Admin API Routes (/api/admin/...)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const adminToken = request.cookies.get('amm_admin_session_token')?.value
    const authHeader = request.headers.get('authorization')
    const hasBearer = authHeader && authHeader.startsWith('Bearer ')

    if (!adminToken && !hasBearer) {
      return NextResponse.json(
        { error: 'Akses ditolak. Sesi staf admin diperlukan.' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
