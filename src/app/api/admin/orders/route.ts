import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'
import { MembershipService } from '@/lib/membership/membershipService'

export async function GET(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const status = req.nextUrl.searchParams.get('status')
    const branchId = req.nextUrl.searchParams.get('branchId')
    const search = req.nextUrl.searchParams.get('search')
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 50

    let sql = 'SELECT * FROM orders WHERE 1=1'
    const params: any[] = []

    if (status === 'diproses') {
      sql += " AND order_status = 'diproses'"
    } else if (status === 'dikirim') {
      sql += " AND order_status = 'dikirim'"
    } else if (status === 'sampai_unconfirmed') {
      sql += " AND (order_status = 'sampai' OR courier_status = 'DELIVERED') AND customer_confirmed_at IS NULL"
    } else if (status === 'selesai') {
      sql += " AND order_status = 'selesai'"
    } else if (status === 'kendala') {
      sql += " AND delivery_issue_reported = 1"
    } else if (status && status !== 'all') {
      sql += ' AND order_status = ?'
      params.push(status)
    }

    if (branchId && branchId !== 'all') {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    if (search && search.trim()) {
      sql += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'
      const q = `%${search.trim()}%`
      params.push(q, q, q)
    }

    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const orders = db.query(sql, params)

    const ordersFull = orders.map((o) => {
      const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [o.id])
      const itemsWithSeasonings = items.map((it) => {
        const seasonings = db.query(
          'SELECT seasoning_name, qty, extra_price FROM order_item_seasonings WHERE order_item_id = ?',
          [it.id]
        )
        return { ...it, seasonings }
      })

      const payment = db.queryOne('SELECT * FROM payments WHERE order_id = ?', [o.id])
      const gift = db.queryOne('SELECT * FROM gift_details WHERE order_id = ?', [o.id])
      const events = db.query(
        'SELECT * FROM order_status_events WHERE order_id = ? ORDER BY created_at ASC',
        [o.id]
      )

      return {
        ...o,
        items: itemsWithSeasonings,
        payment,
        gift,
        events,
      }
    })

    return NextResponse.json({ orders: ordersFull })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar pesanan.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const {
      orderId,
      orderStatus,
      courierName,
      courierTrackingNumber,
      courierStatus,
      estimatedDeliveryTime,
      correctionReason,
      adminNotes,
    } = body
    const adminName = auth.user?.name || 'Admin'
    const adminId = auth.user?.id || 'admin'

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib disertakan.' }, { status: 400 })
    }

    const order = db.queryOne<{
      id: string
      order_number: string
      order_status: string
      customer_id: string
      subtotal: number
      discount: number
      total: number
    }>(
      'SELECT id, order_number, order_status, customer_id, subtotal, discount, total FROM orders WHERE id = ?',
      [orderId]
    )

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    const nowStr = new Date().toISOString()
    const targetStatus = orderStatus || order.order_status
    const reasonText = (correctionReason || adminNotes || '').trim()

    // If changing status, require reason for audit trail
    if (orderStatus && orderStatus !== order.order_status && reasonText.length < 5) {
      return NextResponse.json(
        { error: 'Koreksi status pesanan oleh admin wajib menyertakan alasan (minimal 5 karakter).' },
        { status: 400 }
      )
    }

    db.transaction(() => {
      db.run(
        `UPDATE orders SET
          order_status = ?,
          courier_name = COALESCE(?, courier_name),
          courier_tracking_number = COALESCE(?, courier_tracking_number),
          courier_status = COALESCE(?, courier_status),
          estimated_delivery_time = COALESCE(?, estimated_delivery_time),
          updated_at = ?
        WHERE id = ?`,
        [
          targetStatus,
          courierName || null,
          courierTrackingNumber || null,
          courierStatus || null,
          estimatedDeliveryTime || null,
          nowStr,
          orderId,
        ]
      )

      if (orderStatus && orderStatus !== order.order_status) {
        db.run(
          `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, actor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `evt_${Date.now()}`,
            orderId,
            order.order_status,
            targetStatus,
            'ADMIN',
            adminId,
            `Status dikoreksi oleh admin (${adminName}): "${reasonText}"`,
          ]
        )

        db.run(
          `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `aud_${Date.now()}`,
            adminId,
            adminName,
            'ORDER_STATUS_CORRECTION',
            'ORDER',
            orderId,
            JSON.stringify({
              from: order.order_status,
              to: targetStatus,
              reason: reasonText,
            }),
            nowStr,
          ]
        )
      }
    })

    // Automatic Loyalty Points: Award on completion ('selesai')
    if (targetStatus === 'selesai' && order.order_status !== 'selesai') {
      MembershipService.awardOrderPoints({
        orderNumber: order.order_number,
        customerId: order.customer_id || `cust_${order.order_number}`,
        subtotal: order.subtotal,
        discount: order.discount || 0,
      })
    }

    // Automatic Loyalty Points: Reverse on cancellation/refund after completed
    if (order.order_status === 'selesai' && (targetStatus === 'dibatalkan' || targetStatus === 'refund')) {
      MembershipService.reverseOrderPoints({
        orderNumber: order.order_number,
        customerId: order.customer_id || `cust_${order.order_number}`,
        reason: reasonText || 'Pembatalan pesanan oleh admin',
        adminId,
        adminName,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Data pesanan ${order.order_number} berhasil diperbarui.`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui status pesanan.' }, { status: 500 })
  }
}
