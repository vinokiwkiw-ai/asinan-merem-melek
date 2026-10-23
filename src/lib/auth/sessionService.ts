import crypto from 'node:crypto'
import { db } from '../db/index.ts'

export const SESSION_COOKIE_NAME = 'amm_customer_session_token'
const SESSION_EXPIRY_DAYS = 30
const SESSION_SECRET = process.env.SESSION_SECRET || 'amm_prod_session_secret_change_this_to_strong_random_string_32_chars'

export interface CustomerSessionUser {
  id: string
  phone: string
  name: string
  email?: string
}

export class SessionService {
  /**
   * Encode a compact 64-character base64url stateless HMAC token (48 bytes binary)
   * Bytes:
   * 0: customerId length (1 byte, max 25)
   * 1..25: customerId utf8 (25 bytes)
   * 26..32: phone as 7-byte big-endian integer (7 bytes)
   * 33..36: expiresAt unix timestamp in seconds (4 bytes UInt32BE)
   * 37..47: HMAC-SHA256 signature (11 bytes)
   * Total = 48 bytes -> base64url length is EXACTLY 64 chars.
   */
  static encodeCompactToken(params: {
    customerId: string
    phone?: string
    expiresAt: Date
  }): string {
    const { customerId, phone = '', expiresAt } = params
    const buf = Buffer.alloc(48)
    const idBuf = Buffer.from(customerId, 'utf8')
    const idLen = Math.min(idBuf.length, 25)
    buf.writeUInt8(idLen, 0)
    idBuf.copy(buf, 1, 0, idLen)

    const cleanPhone = BigInt(phone.replace(/\D/g, '') || '0')
    for (let i = 0; i < 7; i++) {
      buf[26 + i] = Number((cleanPhone >> BigInt((6 - i) * 8)) & 0xffn)
    }

    const expSec = Math.floor(expiresAt.getTime() / 1000)
    buf.writeUInt32BE(expSec, 33)

    const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(buf.subarray(0, 37)).digest()
    hmac.copy(buf, 37, 0, 11)

    return buf.toString('base64url')
  }

  /**
   * Decode and cryptographically verify compact 64-character token
   */
  static decodeCompactToken(token: string): { customerId: string; phone: string; expiresAt: Date } | null {
    if (typeof token !== 'string' || token.length !== 64) return null
    let buf: Buffer
    try {
      buf = Buffer.from(token, 'base64url')
    } catch {
      return null
    }
    if (buf.length !== 48) return null

    const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(buf.subarray(0, 37)).digest()
    const expectedMac = hmac.subarray(0, 11)
    const actualMac = buf.subarray(37, 48)

    if (!crypto.timingSafeEqual(expectedMac, actualMac)) return null

    const len = buf.readUInt8(0)
    if (len < 3 || len > 25) return null
    const customerId = buf.subarray(1, 1 + len).toString('utf8')

    let phoneBig = 0n
    for (let i = 0; i < 7; i++) {
      phoneBig = (phoneBig << 8n) | BigInt(buf[26 + i])
    }
    const phone = phoneBig > 0n ? phoneBig.toString() : ''

    const expSec = buf.readUInt32BE(33)
    const expiresAt = new Date(expSec * 1000)
    if (Date.now() > expiresAt.getTime()) return null

    return { customerId, phone, expiresAt }
  }

  /**
   * Create an authenticated session record and return the token
   */
  static createSession(params: {
    customerId: string
    ipAddress?: string
    userAgent?: string
  }): { sessionToken: string; expiresAt: Date } {
    const { customerId, ipAddress, userAgent } = params
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    // Resolve customer phone if available to embed in stateless token
    const customer = db.queryOne<{ phone: string }>(
      'SELECT phone FROM customers WHERE id = ?',
      [customerId]
    )

    const sessionToken = this.encodeCompactToken({
      customerId,
      phone: customer?.phone || '',
      expiresAt,
    })

    const sessionId = `sess_${crypto.randomUUID()}`

    // Also persist in SQLite customer_sessions for local querying and revocation tracking
    try {
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
    } catch (e) {
      console.error('[SessionService] Session persistence error:', e)
    }

    return { sessionToken, expiresAt }
  }

  /**
   * Validate a session token and resolve customer identity
   */
  static getCustomerFromToken(sessionToken: string): CustomerSessionUser | null {
    if (!sessionToken || sessionToken.length < 32) return null

    // 1. Check revocation table
    try {
      const revoked = db.queryOne<{ session_token: string }>(
        'SELECT session_token FROM revoked_sessions WHERE session_token = ?',
        [sessionToken]
      )
      if (revoked) return null
    } catch {
      // Table may not exist yet on fresh container, continue
    }

    // 2. Decode compact stateless HMAC token (cross-container serverless verification)
    const decoded = this.decodeCompactToken(sessionToken)
    if (decoded) {
      let customer = db.queryOne<CustomerSessionUser>(
        'SELECT id, phone, name, email FROM customers WHERE id = ?',
        [decoded.customerId]
      )

      // Auto-heal: If customer row does not exist in this specific serverless instance,
      // create it so relational integrity and foreign keys succeed
      if (!customer && decoded.phone) {
        try {
          const initialName = `Pelanggan ${decoded.phone.slice(-4)}`
          db.run(
            'INSERT OR IGNORE INTO customers (id, phone, name, email) VALUES (?, ?, ?, ?)',
            [decoded.customerId, decoded.phone, initialName, null]
          )
          customer = db.queryOne<CustomerSessionUser>(
            'SELECT id, phone, name, email FROM customers WHERE id = ?',
            [decoded.customerId]
          )
        } catch (e) {
          console.error('[SessionService] Auto-sync customer error:', e)
        }
      }

      if (customer) return customer
    }

    // 3. Fallback: Query customer_sessions table (for database-stored or legacy tokens)
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
      'SELECT id, phone, name, email FROM customers WHERE id = ?',
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
   * Revoke session token from database and blacklist it
   */
  static revokeSession(sessionToken: string): void {
    if (!sessionToken) return
    try {
      db.run('DELETE FROM customer_sessions WHERE session_token = ?', [sessionToken])
      db.exec('CREATE TABLE IF NOT EXISTS revoked_sessions (session_token TEXT PRIMARY KEY, revoked_at TEXT NOT NULL);')
      db.run('INSERT OR IGNORE INTO revoked_sessions (session_token, revoked_at) VALUES (?, ?)', [
        sessionToken,
        new Date().toISOString(),
      ])
    } catch (e) {
      console.error('[SessionService] Revoke session error:', e)
    }
  }
}
