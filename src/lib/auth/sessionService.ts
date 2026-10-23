import crypto from 'node:crypto'
import { db } from '../db/index.ts'

export const SESSION_COOKIE_NAME = 'amm_customer_session_token'
const SESSION_EXPIRY_DAYS = 30

export interface CustomerSessionUser {
  id: string
  phone: string
  name: string
  email?: string
}

export class SessionService {
  /**
   * Create an authenticated session record and return the token
   */
  static createSession(params: {
    customerId: string
    ipAddress?: string
    userAgent?: string
  }): { sessionToken: string; expiresAt: Date } {
    const { customerId, ipAddress, userAgent } = params
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const sessionId = `sess_${crypto.randomUUID()}`

    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    db.run(
      `INSERT INTO customer_sessions (
        id, customer_id, session_token, ip_address, user_agent, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        customerId,
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
   * Validate a session token and resolve customer identity
   */
  static getCustomerFromToken(sessionToken: string): CustomerSessionUser | null {
    if (!sessionToken || sessionToken.length < 32) return null

    const now = new Date().toISOString()
    const sessionRow = db.queryOne<{
      customer_id: string
      expires_at: string
    }>(
      `SELECT customer_id, expires_at FROM customer_sessions 
       WHERE session_token = ? AND expires_at > ?`,
      [sessionToken, now]
    )

    if (!sessionRow) return null

    const customer = db.queryOne<CustomerSessionUser>(
      `SELECT id, phone, name, email FROM customers WHERE id = ?`,
      [sessionRow.customer_id]
    )

    return customer || null
  }

  /**
   * Resolve customer identity from a token string or return null
   */
  static getCurrentCustomer(token?: string): CustomerSessionUser | null {
    if (!token) return null
    return this.getCustomerFromToken(token)
  }

  /**
   * Revoke session token from database
   */
  static revokeSession(sessionToken: string): void {
    if (sessionToken) {
      db.run(`DELETE FROM customer_sessions WHERE session_token = ?`, [sessionToken])
    }
  }
}
