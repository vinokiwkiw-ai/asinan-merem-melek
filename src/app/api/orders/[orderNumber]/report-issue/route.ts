import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params
    const body = await req.json()
    const { notes, token } = body

    if (!notes || notes.trim().length < 5) {
      return NextResponse.json({ error: 'Harap jelaskan kendala pengiriman Anda (minimal 5 karakter).' }, { status: 400 })
    }

    const order = db.queryOne<{
      id: string
      order_number: string
      customer_name: string
      customer_phone: string
      tracking_token: string
      order_status: string
    }>('SELECT * FROM orders WHERE order_number = ?', [orderNumber])

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    if (token && order.tracking_token !== token) {
      return NextResponse.json({ error: 'Akses tidak sah untuk pesanan ini.' }, { status: 403 })
    }

    const nowStr = new Date().toISOString()
    const trimmedNotes = notes.trim()

    db.transaction(() => {
      // 1. Flag issue in order record (does NOT mark order as completed!)
      db.run(
        `UPDATE orders SET
          delivery_issue_reported = 1,
          delivery_issue_notes = ?,
          delivery_issue_reported_at = ?,
          updated_at = ?
        WHERE id = ?`,
        [trimmedNotes, nowStr, nowStr, order.id]
      )

      // 2. Append event to order timeline
      db.run(
        `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `evt_${Date.now()}`,
          order.id,
          order.order_status,
          order.order_status,
          'CUSTOMER',
          `Pelanggan melaporkan belum menerima pesanan: "${trimmedNotes}"`,
        ]
      )

      // 3. Create open support ticket for Customer Support team
      db.run(
        `INSERT INTO support_tickets (id, order_id, customer_name, customer_phone, category, description, status, created_at)
         VALUES (?, ?, ?, ?, 'DELIVERY_ISSUE', ?, 'OPEN', ?)`,
        [
          `tick_${Date.now()}`,
          order.id,
          order.customer_name,
          order.customer_phone,
          `Kendala pesanan ${order.order_number}: ${trimmedNotes}`,
          nowStr,
        ]
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Laporan kendala Anda telah diterima. Tim admin kami akan segera menindaklanjuti ke pihak kurir.',
      reportedAt: nowStr,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengirim laporan kendala.' }, { status: 500 })
  }
}
