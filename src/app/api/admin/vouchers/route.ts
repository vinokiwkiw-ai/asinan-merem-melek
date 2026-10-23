import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const vouchers = db.query('SELECT * FROM vouchers ORDER BY is_active DESC, code ASC')
    return NextResponse.json({ vouchers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat voucher.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      code,
      discount_type,
      discount_value,
      min_spend,
      max_discount,
      usage_limit,
      start_date,
      end_date,
      is_active,
    } = body

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: 'Kode, tipe diskon, dan nilai diskon wajib diisi.' }, { status: 400 })
    }

    const vouchId = id || `vouch_${Date.now()}`
    const normalizedCode = code.trim().toUpperCase()

    db.run(
      `INSERT OR REPLACE INTO vouchers (
        id, code, discount_type, discount_value, min_spend, max_discount,
        usage_limit, start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vouchId,
        normalizedCode,
        discount_type,
        Number(discount_value),
        Number(min_spend) || 0,
        Number(max_discount) || 0,
        Number(usage_limit) || 100,
        start_date || null,
        end_date || null,
        is_active ? 1 : 0,
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Voucher "${normalizedCode}" berhasil disimpan.`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan voucher.' }, { status: 500 })
  }
}
