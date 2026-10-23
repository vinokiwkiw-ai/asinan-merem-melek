import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'node:crypto'

const SALT = 'amm_secure_salt_2026'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan kata sandi wajib diisi.' }, { status: 400 })
    }

    const passwordHash = crypto.createHmac('sha256', SALT).update(password).digest('hex')

    const user = db.queryOne<{
      id: string
      email: string
      username: string
      name: string
      role: string
      status: string
    }>(
      'SELECT id, email, username, name, role, status FROM admin_users WHERE (username = ? OR email = ?) AND password_hash = ?',
      [username.trim(), username.trim(), passwordHash]
    )

    if (!user) {
      return NextResponse.json({ error: 'Username atau kata sandi salah.' }, { status: 401 })
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Akun staf ini sedang disuspensi.' }, { status: 403 })
    }

    // Role-based permissions map
    const permissions: Record<string, string[]> = {
      SUPER_ADMIN: ['overview', 'orders', 'payments', 'products', 'outlets', 'vouchers', 'membership', 'reviews', 'reports', 'settings'],
      ORDER_MANAGER: ['overview', 'orders', 'products', 'outlets', 'reports'],
      PAYMENT_VERIFIER: ['overview', 'payments', 'orders'],
      CUSTOMER_SUPPORT: ['overview', 'orders', 'reviews', 'support'],
      REPORTING_VIEWER: ['overview', 'reports'],
    }

    const nowStr = new Date().toISOString()
    db.run('UPDATE admin_users SET last_login = ? WHERE id = ?', [nowStr, user.id])

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: permissions[user.role] || ['overview'],
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal masuk akun staf.' }, { status: 500 })
  }
}
