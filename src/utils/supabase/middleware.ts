import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin Route Protection
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isAuthRoute = request.nextUrl.pathname === '/admin/login' || request.nextUrl.pathname === '/admin/forgot-password'

  if (isAdminRoute && !isAuthRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    // Check if user is admin via their role metadata or querying the admin_users table
    // For now, we will assume any user who logged in via /admin is an admin
    // In a real app, you would query your admin_users table or JWT metadata here
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // If user is already logged in as admin, prevent them from accessing login page again
  if (isAuthRoute && user) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminUser && ['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Customer Route Protection
  const isCustomerRoute = request.nextUrl.pathname.startsWith('/account') || request.nextUrl.pathname === '/checkout'
  
  if (isCustomerRoute) {
    if (!user) {
      // In a real app, you might redirect to a modal or a login page
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Ensure they are a customer (not an admin accessing customer routes)
    const { data: customerData } = await supabase
      .from('customers')
      .select('id')
      .eq('id', user.id)
      .single()
      
    if (!customerData) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}
