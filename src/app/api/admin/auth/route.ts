import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

const GENERIC_ERROR_MESSAGE = 'Kredensial tidak valid. Periksa kembali ID dan kata sandi Anda.'

/**
 * GET: Verify active admin session
 */
export async function GET(req: NextRequest) {
  try {
    const admin = AdminSessionService.getAdminFromRequest(req)
    if (!admin) {
      return NextResponse.json(
        { authenticated: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: admin,
    })
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message || 'Gagal memeriksa sesi admin.' },
      { status: 500 }
    )
  }
}

/**
 * POST: Admin login & session creation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, action } = body

    // Support logout via POST if needed
    if (action === 'LOGOUT') {
      const admin = AdminSessionService.getAdminFromRequest(req)
      const token = req.cookies.get('amm_admin_session_token')?.value
      if (token) {
        AdminSessionService.revokeSession(token)
      }
      const res = NextResponse.json({ success: true, message: 'Berhasil keluar.' })
      AdminSessionService.clearAdminCookie(res)
      return res
    }

    if (!username || !password) {
      return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 400 })
    }

    const trimmedIdentifier = username.trim()

    // 1. Anti-brute-force rate limit check
    const rateLimit = AdminSessionService.checkRateLimit(trimmedIdentifier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan masuk yang gagal. Harap tunggu ${rateLimit.waitSeconds} detik sebelum mencoba kembali.`,
        },
        { status: 429 }
      )
    }

    // 2. Hash password & verify against database
    const passwordHash = AdminSessionService.hashPassword(password)
    const user = db.queryOne<{
      id: string
      email: string
      username: string
      name: string
      role: string
      status: string
    }>(
      'SELECT id, email, username, name, role, status FROM admin_users WHERE (username = ? OR email = ?) AND password_hash = ?',
      [trimmedIdentifier, trimmedIdentifier, passwordHash]
    )

    if (!user) {
      AdminSessionService.recordFailedLogin(trimmedIdentifier)
      return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 })
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Akun staf ini sedang disuspensi.' }, { status: 403 })
    }

    // 3. Reset rate limit & update last login
    AdminSessionService.resetRateLimit(trimmedIdentifier)
    const nowStr = new Date().toISOString()
    db.run('UPDATE admin_users SET last_login = ? WHERE id = ?', [nowStr, user.id])

    // 4. Create persistent server session
    const ipAddress = req.headers.get('x-forwarded-for') || undefined
    const userAgent = req.headers.get('user-agent') || undefined
    const { sessionToken, expiresAt } = AdminSessionService.createSession({
      adminId: user.id,
      ipAddress,
      userAgent,
    })

    const permissions = AdminSessionService.getAdminFromToken(sessionToken)?.permissions || ['overview']

    // 5. Build response and set HttpOnly session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions,
      },
    })

    AdminSessionService.setAdminCookie(response, sessionToken, expiresAt)
    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal masuk akun staf.' }, { status: 500 })
  }
}

/**
 * DELETE: Admin logout
 */
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('amm_admin_session_token')?.value
    if (token) {
      AdminSessionService.revokeSession(token)
    }
    const response = NextResponse.json({ success: true, message: 'Sesi admin berhasil diakhiri.' })
    AdminSessionService.clearAdminCookie(response)
    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal keluar.' }, { status: 500 })
  }
}
