import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const PROOFS_DIR = path.resolve(process.cwd(), 'data/proofs')

export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params
    const formData = await req.formData()
    const file = formData.get('proofImage') as File | null
    const referenceNumber = (formData.get('referenceNumber') as string) || ''
    const amountTransferred = Number(formData.get('amountTransferred')) || 0

    if (!file) {
      return NextResponse.json({ error: 'File bukti transfer wajib diunggah.' }, { status: 400 })
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
        { error: 'Ukuran file terlalu besar (maksimal 5MB).' },
        { status: 400 }
      )
    }

    const order = db.queryOne<{ id: string; order_number: string; total: number; order_status: string }>(
      'SELECT id, order_number, total, order_status FROM orders WHERE order_number = ?',
      [orderNumber]
    )

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    if (order.order_status === 'dibatalkan' || order.order_status === 'expired') {
      return NextResponse.json(
        { error: 'Pesanan ini sudah kedaluwarsa atau dibatalkan. Tidak dapat mengunggah bukti.' },
        { status: 400 }
      )
    }

    if (!fs.existsSync(PROOFS_DIR)) {
      fs.mkdirSync(PROOFS_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `proof_${orderNumber}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
    const filePath = path.join(PROOFS_DIR, fileName)

    fs.writeFileSync(filePath, buffer)

    const nowStr = new Date().toISOString()
    const relativeProofPath = `/api/admin/proofs/${fileName}`

    // Update payment record in transaction
    db.transaction(() => {
      db.run(
        `UPDATE payments SET
          proof_image_path = ?,
          reference_number = ?,
          amount_transferred = ?,
          uploaded_at = ?,
          status = 'under_verification'
        WHERE order_id = ?`,
        [
          relativeProofPath,
          referenceNumber.trim() || null,
          amountTransferred || order.total,
          nowStr,
          order.id,
        ]
      )

      db.run(
        `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `evt_${Date.now()}`,
          order.id,
          order.order_status,
          order.order_status,
          'CUSTOMER',
          `Bukti transfer diunggah: ${fileName}. Menunggu verifikasi admin.`,
        ]
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Bukti transfer berhasil dikirim. Admin akan segera memverifikasi.',
      uploadedAt: nowStr,
      status: 'under_verification',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengunggah bukti pembayaran.' }, { status: 500 })
  }
}
