import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MembershipService } from '@/lib/membership/membershipService'
import { SessionService } from '@/lib/auth/sessionService'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params
    const body = await req.json().catch(() => ({}))
    const { token, confirmedById, confirmedByName, receiptPhotoUrl } = body

    const order = db.queryOne<{
      id: string
      order_number: string
      subtotal: number
      discount: number
      total: number
      order_status: string
      payment_status: string
      customer_id: string
      customer_name: string
      customer_phone: string
      customer_confirmed_at: string
      tracking_token: string
    }>('SELECT * FROM orders WHERE order_number = ? OR id = ?', [orderNumber, orderNumber])

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    // Validate authorization: requires valid tracking token, authenticated customer session, or active admin
    const adminAuth = AdminSessionService.verifyAdminRequest(req)
    const sessionToken = req.cookies.get('amm_customer_session_token')?.value ||
      (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7).trim() : null)
    const sessionCustomer = sessionToken ? SessionService.getCustomerFromToken(sessionToken) : null

    const isTokenValid = Boolean(token && order.tracking_token === token)
    const isCustomerMatch = Boolean(
      sessionCustomer &&
      (sessionCustomer.id === order.customer_id ||
       sessionCustomer.phone === order.customer_phone ||
       sessionCustomer.phone.replace(/\D/g, '') === String(order.customer_phone || '').replace(/\D/g, ''))
    )
    const isAdmin = adminAuth.authorized

    if (!isTokenValid && !isCustomerMatch && !isAdmin) {
      return NextResponse.json({ error: 'Akses tidak sah. Token pelacakan atau sesi login customer/admin diperlukan.' }, { status: 403 })
    }

    if (order.customer_confirmed_at) {
      return NextResponse.json({ error: 'Pesanan ini sudah pernah dikonfirmasi selesai.' }, { status: 400 })
    }

    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Pesanan belum terverifikasi lunas, tidak dapat dikonfirmasi selesai.' },
        { status: 400 }
      )
    }

    // Eligibility check: order must be in delivery/processing status
    const eligibleStatuses = ['diproses', 'dikirim', 'sampai', 'menunggu_kurir', 'kurir_pickup', 'dalam_perjalanan', 'selesai']
    if (!eligibleStatuses.includes(order.order_status)) {
      return NextResponse.json(
        { error: `Pesanan masih dalam status "${order.order_status}". Konfirmasi hanya dapat dilakukan saat pesanan telah diproses atau dikirim.` },
        { status: 400 }
      )
    }

    const nowStr = new Date().toISOString()
    const finalName = confirmedByName?.trim() || order.customer_name || (isAdmin ? 'Admin AMM' : 'Pelanggan')
    const finalId = confirmedById?.trim() || order.customer_id || (order.customer_phone ? `cust_${String(order.customer_phone).replace(/\D/g, '')}` : `cust_${order.order_number}`)
    const targetLoyaltyCustomerId = order.customer_id || (order.customer_phone ? `cust_${String(order.customer_phone).replace(/\D/g, '')}` : finalId)

    db.transaction(() => {
      // 1. Update order status to selesai
      db.run(
        `UPDATE orders SET
          order_status = 'selesai',
          customer_confirmed_at = ?,
          confirmed_by_id = ?,
          confirmed_by_name = ?,
          receipt_photo_url = COALESCE(?, receipt_photo_url),
          receipt_photo_uploaded_at = CASE WHEN ? IS NOT NULL THEN ? ELSE receipt_photo_uploaded_at END,
          delivery_issue_reported = 0,
          updated_at = ?
        WHERE id = ?`,
        [
          nowStr,
          finalId,
          finalName,
          receiptPhotoUrl || null,
          receiptPhotoUrl || null,
          nowStr,
          nowStr,
          order.id,
        ]
      )

      // 2. Order event log
      db.run(
        `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, actor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `evt_${Date.now()}`,
          order.id,
          order.order_status,
          'selesai',
          isAdmin ? 'ADMIN' : 'CUSTOMER',
          finalId,
          `${isAdmin ? 'Admin' : 'Pelanggan'} (${finalName}) mengonfirmasi pesanan telah diterima dengan baik.` +
            (receiptPhotoUrl ? ' (Foto bukti penerimaan terlampir).' : ''),
        ]
      )
    })

    // 3. Award loyalty points via MembershipService (Rp 100.000 = 100 poin, kelipatan, anti-duplikasi)
    const pointResult = MembershipService.awardOrderPoints({
      orderNumber: order.order_number,
      customerId: targetLoyaltyCustomerId,
      subtotal: order.subtotal,
      discount: order.discount || 0,
    })

    return NextResponse.json({
      success: true,
      message: 'Pesanan berhasil dikonfirmasi diterima. Selamat menikmati kesegaran Asinan Merem Melek!',
      pointsAwarded: pointResult.points,
      newPointsBalance: pointResult.newBalance,
      confirmedAt: nowStr,
      confirmedBy: finalName,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengonfirmasi pesanan.' }, { status: 500 })
  }
}
