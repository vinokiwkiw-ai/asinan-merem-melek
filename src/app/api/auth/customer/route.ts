import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'node:crypto'
import { OtpService } from '@/lib/auth/otpService'
import { SessionService, SESSION_COOKIE_NAME } from '@/lib/auth/sessionService'

const SALT = 'amm_customer_salt_2026'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ||
      (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7).trim() : null)
    if (!token) {
      return NextResponse.json({ authenticated: false, customer: null })
    }

    const customer = SessionService.getCustomerFromToken(token)
    if (!customer) {
      return NextResponse.json({ authenticated: false, customer: null })
    }

    // Get points balance
    const pointsRow = db.queryOne<{ total_points: number }>(
      'SELECT COALESCE(SUM(points), 0) as total_points FROM membership_ledger WHERE customer_id = ?',
      [customer.id]
    )

    return NextResponse.json({
      authenticated: true,
      sessionToken: token,
      customer: {
        ...customer,
        points: pointsRow ? Number(pointsRow.total_points) : 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memeriksa sesi pelanggan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, phone, otp, name, email, password } = body

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined
    const userAgent = req.headers.get('user-agent') || undefined

    // 1. ACTION: REQUEST OTP
    if (action === 'REQUEST_OTP') {
      if (!phone) {
        return NextResponse.json({ error: 'Nomor WhatsApp / Telepon wajib diisi.' }, { status: 400 })
      }

      const otpResult = await OtpService.requestOtp({
        phone,
        action: 'LOGIN',
      })

      if (!otpResult.success) {
        return NextResponse.json({ error: otpResult.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        maskedPhone: otpResult.maskedPhone,
        cooldownSeconds: otpResult.cooldownSeconds,
        expiresInMinutes: otpResult.expiresInMinutes,
        provider: otpResult.provider,
        devOtp: otpResult.devOtp,
        message: otpResult.devOtp
          ? (otpResult.error
              ? `Gateway WhatsApp mengembalikan catatan: "${otpResult.error}". Menggunakan mode simulasi darurat.`
              : `Mode Simulasi Aktif: Kode OTP tersedia di layar.`)
          : `Kode OTP telah dikirimkan ke nomor ${otpResult.maskedPhone}.`,
      })
    }

    // 2. ACTION: VERIFY OTP & LOGIN / REGISTER
    if (action === 'VERIFY_OTP') {
      if (!phone || !otp) {
        return NextResponse.json({ error: 'Nomor telepon dan 6 digit kode OTP wajib diisi.' }, { status: 400 })
      }

      const normalizedPhone = OtpService.normalizePhone(phone)
      const verifyResult = OtpService.verifyOtp({
        phone: normalizedPhone,
        otp: otp.trim(),
        action: 'LOGIN',
      })

      if (!verifyResult.isValid) {
        return NextResponse.json({ error: verifyResult.error }, { status: 400 })
      }

      // Check if customer exists, otherwise auto-create
      let customer = db.queryOne<{
        id: string
        phone: string
        name: string
        email: string
      }>('SELECT id, phone, name, email FROM customers WHERE phone = ?', [normalizedPhone])

      if (!customer) {
        const customerId = `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
        const initialName = name?.trim() || `Pelanggan ${normalizedPhone.slice(-4)}`
        db.run(
          `INSERT INTO customers (id, phone, name, email) VALUES (?, ?, ?, ?)`,
          [customerId, normalizedPhone, initialName, email?.trim() || null]
        )
        customer = {
          id: customerId,
          phone: normalizedPhone,
          name: initialName,
          email: email?.trim() || '',
        }
      } else if (name && name.trim().length >= 2 && customer.name.startsWith('Pelanggan ')) {
        // If customer had an auto-generated name and now provided a name
        db.run('UPDATE customers SET name = ? WHERE id = ?', [name.trim(), customer.id])
        customer.name = name.trim()
      }

      // Create persistent session
      const { sessionToken, expiresAt } = SessionService.createSession({
        customerId: customer.id,
        ipAddress,
        userAgent,
      })

      // Fetch points balance
      const pointsRow = db.queryOne<{ total_points: number }>(
        'SELECT COALESCE(SUM(points), 0) as total_points FROM membership_ledger WHERE customer_id = ?',
        [customer.id]
      )

      const response = NextResponse.json({
        success: true,
        sessionToken,
        message: 'Verifikasi OTP berhasil. Selamat datang di Asinan Merem Melek!',
        customer: {
          ...customer,
          points: pointsRow ? Number(pointsRow.total_points) : 0,
        },
      })

      // Set HttpOnly, SameSite secure cookie
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        expires: expiresAt,
      })

      return response
    }

    // 3. ACTION: LOGOUT
    if (action === 'LOGOUT') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ||
        (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7).trim() : null)
      if (token) {
        SessionService.revokeSession(token)
      }

      const response = NextResponse.json({ success: true, message: 'Berhasil keluar.' })
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    // 4. LEGACY / PASSWORD-BASED REGISTER (Maintained for Backward Compatibility)
    if (action === 'REGISTER') {
      if (!phone || phone.replace(/\D/g, '').length < 9) {
        return NextResponse.json({ error: 'Nomor WhatsApp tidak valid.' }, { status: 400 })
      }
      const normalizedPhone = OtpService.normalizePhone(phone)

      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 })
      }
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 })
      }

      const existing = db.queryOne('SELECT id FROM customers WHERE phone = ?', [normalizedPhone])
      if (existing) {
        return NextResponse.json({ error: 'Nomor WhatsApp ini sudah terdaftar. Silakan masuk.' }, { status: 400 })
      }

      const passwordHash = crypto.createHmac('sha256', SALT).update(password).digest('hex')
      const customerId = `cust_${Date.now()}`

      db.run(
        `INSERT INTO customers (id, phone, name, email, password_hash) VALUES (?, ?, ?, ?, ?)`,
        [customerId, normalizedPhone, name.trim(), email?.trim() || null, passwordHash]
      )

      const { sessionToken, expiresAt } = SessionService.createSession({
        customerId,
        ipAddress,
        userAgent,
      })

      const response = NextResponse.json({
        success: true,
        sessionToken,
        customer: {
          id: customerId,
          phone: normalizedPhone,
          name: name.trim(),
          email: email?.trim() || null,
        },
      })

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        expires: expiresAt,
      })

      return response
    }

    // 5. LEGACY / PASSWORD-BASED LOGIN (Maintained for Backward Compatibility)
    if (action === 'LOGIN') {
      if (!phone || !password) {
        return NextResponse.json({ error: 'Nomor telepon dan kata sandi wajib diisi.' }, { status: 400 })
      }
      const normalizedPhone = OtpService.normalizePhone(phone)

      const passwordHash = crypto.createHmac('sha256', SALT).update(password).digest('hex')
      const customer = db.queryOne<{
        id: string
        phone: string
        name: string
        email: string
      }>('SELECT id, phone, name, email FROM customers WHERE phone = ? AND password_hash = ?', [
        normalizedPhone,
        passwordHash,
      ])

      if (!customer) {
        return NextResponse.json({ error: 'Nomor telepon atau kata sandi tidak cocok.' }, { status: 401 })
      }

      const { sessionToken, expiresAt } = SessionService.createSession({
        customerId: customer.id,
        ipAddress,
        userAgent,
      })

      const response = NextResponse.json({
        success: true,
        sessionToken,
        customer,
      })

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        expires: expiresAt,
      })

      return response
    }

    return NextResponse.json({ error: 'Aksi otentikasi tidak dikenal.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memproses akun pelanggan.' }, { status: 500 })
  }
}
