import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bypass middleware if Supabase env vars are not set (development without DB)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (
    !supabaseUrl ||
    supabaseUrl.includes('dummy') ||
    !supabaseKey ||
    supabaseKey.includes('dummy')
  ) {
    return NextResponse.next()
  }

  // Dynamically import to avoid crashing when env is missing
  const { updateSession } = await import('./utils/supabase/middleware')
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
