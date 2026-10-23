import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

export async function POST(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const { orderId, action, rejectionReason } = body
    const adminName = auth.user?.name || 'Admin'
    const adminId = auth.user?.id || 'admin'

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib disertakan.' }, { status: 400 })
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Aksi verifikasi tidak valid.' }, { status: 400 })
    }

    if (action === 'REJECT' && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return NextResponse.json(
        { error: 'Alasan penolakan pembayaran wajib diisi (minimal 5 karakter).' },
        { status: 400 }
      )
    }

    const order = db.queryOne<{
      id: string
      order_number: string
      total: number
      order_status: string
      payment_status: string
      customer_id: string
    }>('SELECT * FROM orders WHERE id = ?', [orderId])

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    const payment = db.queryOne<{ id: string; status: string }>('SELECT * FROM payments WHERE order_id = ?', [
      orderId,
    ])

    if (!payment) {
      return NextResponse.json({ error: 'Data pembayaran tidak ditemukan.' }, { status: 404 })
    }

    if (payment.status === 'payment_verified' && action === 'APPROVE') {
      return NextResponse.json({ error: 'Pembayaran ini sudah pernah diverifikasi sebelumnya.' }, { status: 400 })
    }

    const nowStr = new Date().toISOString()

    db.transaction(() => {
      if (action === 'APPROVE') {
        // Approve Payment
        db.run(
          `UPDATE payments SET
            status = 'payment_verified',
            verified_at = ?,
            verified_by = ?,
            rejection_reason = NULL
          WHERE order_id = ?`,
          [nowStr, adminName, orderId]
        )

        db.run(
          `UPDATE orders SET
            payment_status = 'paid',
            order_status = 'diproses',
            updated_at = ?
          WHERE id = ?`,
          [nowStr, orderId]
        )

        // Event Log
        db.run(
          `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, actor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `evt_${Date.now()}`,
            orderId,
            order.order_status,
            'diproses',
            'ADMIN',
            adminId,
            `Pembayaran diverifikasi oleh ${adminName}. Pesanan masuk antrean dapur.`,
          ]
        )

        // Audit Log
        db.run(
          `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `aud_${Date.now()}`,
            adminId,
            adminName,
            'APPROVE_PAYMENT',
            'ORDER',
            orderId,
            JSON.stringify({ orderNumber: order.order_number, total: order.total }),
          ]
        )
      } else {
        // Reject Payment
        db.run(
          `UPDATE payments SET
            status = 'payment_rejected',
            verified_at = ?,
            verified_by = ?,
            rejection_reason = ?
          WHERE order_id = ?`,
          [nowStr, adminName, rejectionReason.trim(), orderId]
        )

        db.run(
          `UPDATE orders SET
            payment_status = 'failed',
            updated_at = ?
          WHERE id = ?`,
          [nowStr, orderId]
        )

        // Event Log
        db.run(
          `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, actor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `evt_${Date.now()}`,
            orderId,
            order.order_status,
            order.order_status,
            'ADMIN',
            adminId,
            `Pembayaran ditolak: ${rejectionReason.trim()}`,
          ]
        )

        // Audit Log
        db.run(
          `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `aud_${Date.now()}`,
            adminId,
            adminName,
            'REJECT_PAYMENT',
            'ORDER',
            orderId,
            JSON.stringify({ orderNumber: order.order_number, reason: rejectionReason.trim() }),
          ]
        )
      }
    })

    return NextResponse.json({
      success: true,
      action,
      orderNumber: order.order_number,
      message: action === 'APPROVE' ? 'Pembayaran berhasil diverifikasi.' : 'Bukti pembayaran berhasil ditolak.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memproses verifikasi.' }, { status: 500 })
  }
}
