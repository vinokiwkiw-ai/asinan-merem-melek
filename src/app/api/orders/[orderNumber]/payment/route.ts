import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params
    const token = req.nextUrl.searchParams.get('token')

    const order = db.queryOne<{
      id: string
      order_number: string
      customer_name: string
      customer_phone: string
      branch_id: string
      delivery_type: string
      delivery_address: string
      subtotal: number
      discount: number
      gift_charge: number
      delivery_fee: number
      total: number
      order_status: string
      payment_status: string
      payment_expires_at: string
      tracking_token: string
      created_at: string
    }>('SELECT * FROM orders WHERE order_number = ? OR id = ?', [orderNumber, orderNumber])

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    // Protection: verify token if provided
    if (token && order.tracking_token !== token) {
      return NextResponse.json({ error: 'Akses tidak sah.' }, { status: 403 })
    }

    // Check payment record
    const payment = db.queryOne<{
      id: string
      bank_name: string
      account_number: string
      account_holder: string
      amount_expected: number
      amount_transferred: number
      reference_number: string
      proof_image_path: string
      uploaded_at: string
      verified_at: string
      rejection_reason: string
      status: string
    }>('SELECT * FROM payments WHERE order_id = ?', [order.id])

    // Fetch order items & seasonings
    const items = db.query<{
      id: string
      product_name: string
      size: string
      unit_price: number
      qty: number
      subtotal: number
      custom_fruit_notes: string
    }>('SELECT * FROM order_items WHERE order_id = ?', [order.id])

    const itemsWithSeasonings = items.map((it) => {
      const seasonings = db.query<{
        seasoning_name: string
        qty: number
        extra_price: number
      }>('SELECT seasoning_name, qty, extra_price FROM order_item_seasonings WHERE order_item_id = ?', [it.id])
      return { ...it, seasonings }
    })

    // Gift details
    const gift = db.queryOne('SELECT * FROM gift_details WHERE order_id = ?', [order.id])

    // Check 12-minute expiration on backend
    const now = new Date()
    const expiryTime = new Date(order.payment_expires_at)
    const isExpired =
      now > expiryTime &&
      order.payment_status !== 'paid' &&
      payment?.status !== 'under_verification' &&
      payment?.status !== 'payment_verified'

    if (isExpired && order.order_status === 'menunggu_pembayaran') {
      db.transaction(() => {
        db.run('UPDATE orders SET order_status = ?, payment_status = ? WHERE id = ?', [
          'dibatalkan',
          'expired',
          order.id,
        ])
        db.run('UPDATE payments SET status = ? WHERE order_id = ?', ['expired', order.id])
        db.run(
          `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, notes) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `evt_${Date.now()}`,
            order.id,
            'menunggu_pembayaran',
            'dibatalkan',
            'SYSTEM',
            'Batas waktu pembayaran 12 menit telah berakhir.',
          ]
        )
      })
      order.order_status = 'dibatalkan'
      order.payment_status = 'expired'
    }

    const remainingSeconds = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000))
    const events = db.query('SELECT * FROM order_status_events WHERE order_id = ? ORDER BY created_at ASC', [order.id])

    return NextResponse.json({
      order: {
        ...order,
        items: itemsWithSeasonings,
        gift,
        events,
      },
      payment,
      isExpired,
      remainingSeconds,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat status pembayaran.' }, { status: 500 })
  }
}
