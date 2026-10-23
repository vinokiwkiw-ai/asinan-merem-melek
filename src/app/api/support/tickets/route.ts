import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status')
    const customerPhone = req.nextUrl.searchParams.get('customerPhone')

    let sql = 'SELECT * FROM support_tickets WHERE 1=1'
    const params: any[] = []

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    if (customerPhone) {
      sql += ' AND customer_phone = ?'
      params.push(customerPhone)
    }

    sql += ' ORDER BY created_at DESC'
    const tickets = db.query(sql, params)

    const ticketsWithMessages = tickets.map((t) => {
      const messages = db.query('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC', [
        t.id,
      ])
      return { ...t, messages }
    })

    return NextResponse.json({ tickets: ticketsWithMessages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat tiket bantuan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderNumber, customerName, customerPhone, category, description } = body

    if (!customerName || !customerPhone || !description) {
      return NextResponse.json({ error: 'Nama, nomor WhatsApp, dan deskripsi keluhan wajib diisi.' }, { status: 400 })
    }

    let orderId: string | null = null
    if (orderNumber) {
      const order = db.queryOne<{ id: string }>('SELECT id FROM orders WHERE order_number = ?', [
        orderNumber.trim(),
      ])
      if (order) orderId = order.id
    }

    const ticketId = `tkt_${Date.now()}`
    const nowStr = new Date().toISOString()

    db.transaction(() => {
      db.run(
        `INSERT INTO support_tickets (
          id, order_id, customer_name, customer_phone, category, description, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
        [ticketId, orderId, customerName.trim(), customerPhone.trim(), category || 'Pesanan', description.trim(), nowStr]
      )

      db.run(
        `INSERT INTO support_messages (
          id, ticket_id, sender_type, sender_name, message, created_at
        ) VALUES (?, ?, 'CUSTOMER', ?, ?, ?)`,
        [`msg_${Date.now()}`, ticketId, customerName.trim(), description.trim(), nowStr]
      )
    })

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Tiket keluhan berhasil dibuat. Tim support AMM akan segera membalas.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal membuat tiket keluhan.' }, { status: 500 })
  }
}
