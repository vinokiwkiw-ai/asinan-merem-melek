import crypto from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'
import { db } from '../db/index.ts'

export const ADMIN_SESSION_COOKIE_NAME = 'amm_admin_session_token'
const ADMIN_SESSION_EXPIRY_DAYS = 7
const ADMIN_SALT = process.env.ADMIN_HASH_SALT || 'amm_secure_salt_2026'

export interface AdminSessionUser {
  id: string
  email: string
  username: string
  name: string
  role: string
  status: string
  permissions: string[]
}

export const ADMIN_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['overview', 'orders', 'payments', 'products', 'outlets', 'vouchers', 'membership', 'reviews', 'reports', 'settings'],
  ORDER_MANAGER: ['overview', 'orders', 'products', 'outlets', 'reports'],
  PAYMENT_VERIFIER: ['overview', 'payments', 'orders'],
  CUSTOMER_SUPPORT: ['overview', 'orders', 'reviews', 'support'],
  REPORTING_VIEWER: ['overview', 'reports'],
}

// In-memory rate limiter for admin login attempts: max 5 failed attempts per 15 minutes
interface RateLimitRecord {
  failedAttempts: number
  lockedUntil: number
}
const loginRateLimitMap = new Map<string, RateLimitRecord>()

export class AdminSessionService {
  /**
   * Password hashing with HMAC-SHA256 and configured salt
   */
  static hashPassword(password: string): string {
    return crypto.createHmac('sha256', ADMIN_SALT).update(password).digest('hex')
  }

  /**
   * Check login rate limit to protect against brute-force attacks
   */
  static checkRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
    const key = identifier.toLowerCase().trim()
    const record = loginRateLimitMap.get(key)
    if (!record) return { allowed: true }

    const now = Date.now()
    if (record.lockedUntil > now) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000)
      return { allowed: false, waitSeconds }
    }

    if (now - record.lockedUntil > 15 * 60 * 1000) {
      loginRateLimitMap.delete(key)
    }

    return { allowed: true }
  }

  /**
   * Record a failed login attempt
   */
  static recordFailedLogin(identifier: string): void {
    const key = identifier.toLowerCase().trim()
    const now = Date.now()
    const record = loginRateLimitMap.get(key) || { failedAttempts: 0, lockedUntil: 0 }

    record.failedAttempts += 1
    if (record.failedAttempts >= 5) {
      record.lockedUntil = now + 15 * 60 * 1000 // Lock for 15 minutes
    }
    loginRateLimitMap.set(key, record)
  }

  /**
   * Reset rate limit upon successful login
   */
  static resetRateLimit(identifier: string): void {
    const key = identifier.toLowerCase().trim()
    loginRateLimitMap.delete(key)
  }

  /**
   * Create an authenticated session record for an admin user
   */
  static createSession(params: {
    adminId: string
    ipAddress?: string
    userAgent?: string
  }): { sessionToken: string; expiresAt: Date } {
    const { adminId, ipAddress, userAgent } = params
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const sessionId = `asess_${crypto.randomUUID()}`

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ADMIN_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    db.run(
      `INSERT INTO admin_sessions (
        id, admin_id, session_token, ip_address, user_agent, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        adminId,
        sessionToken,
        ipAddress || null,
        userAgent || null,
        expiresAt.toISOString(),
        now.toISOString(),
      ]
    )

    return { sessionToken, expiresAt }
  }

  /**
   * Validate a session token and resolve admin user identity & RBAC permissions
   */
  static getAdminFromToken(sessionToken?: string): AdminSessionUser | null {
    if (!sessionToken || sessionToken.length < 32) return null

    const now = new Date().toISOString()
    const sessionRow = db.queryOne<{
      admin_id: string
      expires_at: string
    }>(
      `SELECT admin_id, expires_at FROM admin_sessions 
       WHERE session_token = ? AND expires_at > ?`,
      [sessionToken, now]
    )

    if (!sessionRow) return null

    const user = db.queryOne<{
      id: string
      email: string
      username: string
      name: string
      role: string
      status: string
    }>(
      `SELECT id, email, username, name, role, status FROM admin_users WHERE id = ?`,
      [sessionRow.admin_id]
    )

    if (!user || user.status !== 'ACTIVE') return null

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      status: user.status,
      permissions: ADMIN_ROLE_PERMISSIONS[user.role] || ['overview'],
    }
  }

  /**
   * Resolve admin user identity from request cookies or Authorization header
   */
  static getAdminFromRequest(req: NextRequest | Request): AdminSessionUser | null {
    let token: string | undefined

    if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
      token = (req as NextRequest).cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value
    } else {
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.match(new RegExp(`(?:^|; )${ADMIN_SESSION_COOKIE_NAME}=([^;]*)`))
      if (match) token = decodeURIComponent(match[1])
    }

    if (!token) {
      const authHeader = req.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim()
      }
    }

    return this.getAdminFromToken(token)
  }

  /**
   * Verify admin authorization for an API request (defense-in-depth server guard)
   */
  static verifyAdminRequest(
    req: NextRequest | Request,
    requiredRole?: string
  ): { authorized: boolean; user?: AdminSessionUser; error?: string; status?: number } {
    const user = this.getAdminFromRequest(req)
    if (!user) {
      return {
        authorized: false,
        error: 'Akses ditolak. Sesi staf admin diperlukan.',
        status: 401,
      }
    }

    if (requiredRole && user.role !== 'SUPER_ADMIN' && user.role !== requiredRole) {
      return {
        authorized: false,
        error: 'Akses ditolak. Akun staf Anda tidak memiliki izin untuk tindakan ini.',
        status: 403,
      }
    }

    return {
      authorized: true,
      user,
    }
  }

  /**
   * Revoke session token from database
   */
  static revokeSession(sessionToken: string): void {
    if (sessionToken) {
      db.run(`DELETE FROM admin_sessions WHERE session_token = ?`, [sessionToken])
    }
  }

  /**
   * Set HttpOnly secure cookie on Next.js Response
   */
  static setAdminCookie(response: NextResponse, token: string, expiresAt: Date): void {
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })
  }

  /**
   * Clear admin session cookie
   */
  static clearAdminCookie(response: NextResponse): void {
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    })
  }
}
