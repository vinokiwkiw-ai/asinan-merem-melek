import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const RECEIPTS_DIR = process.env.VERCEL ? path.join('/tmp', 'amm-data/receipts') : path.resolve(process.cwd(), 'data/receipts')

export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params
    const formData = await req.formData()
    const file = formData.get('proofImage') as File | null
    const token = (formData.get('token') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'File foto bukti penerimaan wajib diunggah.' }, { status: 400 })
    }

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Harap unggah gambar JPG, PNG, atau WebP.' },
        { status: 400 }
      )
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file foto terlalu besar (maksimal 5MB).' },
        { status: 400 }
      )
    }

    const order = db.queryOne<{ id: string; order_number: string; tracking_token: string; order_status: string }>(
      'SELECT id, order_number, tracking_token, order_status FROM orders WHERE order_number = ?',
      [orderNumber]
    )

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    if (token && order.tracking_token !== token) {
      return NextResponse.json({ error: 'Akses tidak sah untuk pesanan ini.' }, { status: 403 })
    }

    if (!fs.existsSync(RECEIPTS_DIR)) {
      fs.mkdirSync(RECEIPTS_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `receipt_${orderNumber}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
    const filePath = path.join(RECEIPTS_DIR, fileName)

    fs.writeFileSync(filePath, buffer)

    const nowStr = new Date().toISOString()
    const relativeReceiptPath = `/api/receipts/${fileName}`

    db.transaction(() => {
      db.run(
        `UPDATE orders SET
          receipt_photo_url = ?,
          receipt_photo_uploaded_at = ?,
          updated_at = ?
        WHERE id = ?`,
        [relativeReceiptPath, nowStr, nowStr, order.id]
      )

      db.run(
        `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `evt_${Date.now()}`,
          order.id,
          order.order_status,
          order.order_status,
          'CUSTOMER',
          `Foto bukti penerimaan paket berhasil diunggah (${fileName}).`,
        ]
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Foto bukti penerimaan berhasil diunggah.',
      photoUrl: relativeReceiptPath,
      uploadedAt: nowStr,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengunggah foto bukti penerimaan.' }, { status: 500 })
  }
}
